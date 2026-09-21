import { useSyncExternalStore } from "react";

import { getDatabase, setMutationHandler, setUserSettings, upsertRow, type MutationEvent } from "@/data/store";
import { getCursor, lastSyncAt, setCursor } from "@/sync/cursors";
import { shouldApplyRemote } from "@/sync/merge";
import { ack, enqueue, pending, recordFailure, size } from "@/sync/outbox";
import { SYNC_TABLES, type SyncBackend, type SyncRow, type SyncTableName } from "@/sync/types";

export interface SyncStatus {
  enabled: boolean;
  online: boolean;
  pending: number;
  lastSyncAt: string | null;
  error: string | null;
  syncing: boolean;
}

let status: SyncStatus = {
  enabled: false,
  online: true,
  pending: size(),
  lastSyncAt: lastSyncAt(),
  error: null,
  syncing: false,
};

const statusListeners = new Set<() => void>();

function setStatus(patch: Partial<SyncStatus>): void {
  status = { ...status, ...patch, pending: size(), lastSyncAt: lastSyncAt() };
  for (const listener of statusListeners) listener();
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (listener) => {
      statusListeners.add(listener);
      return () => statusListeners.delete(listener);
    },
    () => status,
    () => status,
  );
}

// --- engine state ---------------------------------------------------------

/**
 * How often to pull while the app is on screen. Realtime is the fast path, but
 * an installed PWA can sit in the background for days: iOS suspends the page,
 * the websocket dies, and nothing wakes the engine again. Without this poll
 * (and the foreground listeners below) a device that is never reloaded simply
 * stops receiving changes made on another device.
 */
const POLL_MS = 60_000;

let backend: SyncBackend | null = null;
let unsubscribeRealtime: (() => void) | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let running = false;

// One cycle at a time; anything asked for meanwhile is folded into it.
let cycle: Promise<void> | null = null;
let queuedPull = false;
let queuedPush = false;

function isOnline(): boolean {
  try {
    return typeof navigator === "undefined" ? true : navigator.onLine !== false;
  } catch {
    return true;
  }
}

function isVisible(): boolean {
  try {
    return typeof document === "undefined" ? true : document.visibilityState !== "hidden";
  } catch {
    return true;
  }
}

function snapshot(table: MutationEvent["table"], id: string): SyncRow | null {
  const db = getDatabase();
  if (table === "user_settings") return (db.user_settings as unknown as SyncRow | null) ?? null;
  const row = (db[table] as unknown as Record<string, SyncRow>)[id];
  return row ?? null;
}

function onLocalMutation(event: MutationEvent): void {
  const row = snapshot(event.table, event.id);
  if (!row) return;
  enqueue(event.table as SyncTableName, row);
  setStatus({});
  schedulePush(0);
}

function schedulePush(delayMs: number): void {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    requestPush();
  }, delayMs);
  (pushTimer as { unref?: () => void }).unref?.();
}

// --- cycle scheduling ------------------------------------------------------

/**
 * Drain whatever is queued. A push and a pull never interleave, so a pull asked
 * for mid-push can no longer be dropped on the floor — it is picked up on the
 * next turn of this loop.
 */
async function drain(): Promise<void> {
  setStatus({ syncing: true });
  try {
    while (running && (queuedPull || queuedPush)) {
      if (queuedPull) {
        queuedPull = false;
        await pullOnce();
      }
      if (queuedPush) {
        queuedPush = false;
        await pushOnce();
      }
    }
  } finally {
    setStatus({ syncing: false });
  }
}

async function pump(): Promise<void> {
  if (cycle) {
    await cycle;
    // Something queued while that cycle was winding down needs a fresh one.
    if (queuedPull || queuedPush) await pump();
    return;
  }
  cycle = drain();
  try {
    await cycle;
  } finally {
    cycle = null;
  }
}

function requestPull(): void {
  queuedPull = true;
  void pump();
}

function requestPush(): void {
  queuedPush = true;
  void pump();
}

// --- the two halves --------------------------------------------------------

async function pushOnce(): Promise<void> {
  if (!backend || !running || !isOnline()) return;
  const entries = pending();
  if (entries.length === 0) return;

  const byTable = new Map<SyncTableName, typeof entries>();
  for (const entry of entries) {
    byTable.set(entry.table, [...(byTable.get(entry.table) ?? []), entry]);
  }

  const activeBackend = backend;
  let failed = false;
  for (const [table, tableEntries] of byTable) {
    if (!running || backend !== activeBackend) break;
    try {
      await activeBackend.pushRows(
        table,
        tableEntries.map((entry) => entry.row),
      );
      if (!running || backend !== activeBackend) break;
      ack(tableEntries);
    } catch (error) {
      failed = true;
      recordFailure(tableEntries);
      setStatus({ error: describe(error), online: isOnline() });
    }
  }

  if (failed) {
    const attempts = pending()[0]?.attempts ?? 1;
    schedulePush(Math.min(60_000, 1000 * 2 ** Math.min(attempts, 6)));
  } else {
    setStatus({ error: null });
  }
}

async function pullOnce(): Promise<void> {
  if (!backend || !running || !isOnline()) return;
  const activeBackend = backend;
  // One table's failure must not stop the rest — a schema hiccup or a bad row
  // on "recurrence_exceptions" used to abort the whole cycle, silently taking
  // every table that comes after it in SYNC_TABLES (including calendar_items
  // and projects) down with it. Isolate each table so the others still land.
  let lastError: unknown = null;
  for (const table of SYNC_TABLES) {
    if (!running || backend !== activeBackend) return;
    try {
      const result = await activeBackend.pullRows(table, getCursor(table));
      if (!running || backend !== activeBackend) return;
      for (const remote of result.rows) {
        const local = snapshot(table, remote.id);
        if (!shouldApplyRemote(local ?? undefined, remote)) continue;
        if (table === "user_settings") {
          setUserSettings(remote as never, true);
        } else {
          upsertRow(table as never, remote as never, true);
        }
      }
      if (result.cursor) setCursor(table, result.cursor);
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) {
    setStatus({ error: describe(lastError), online: isOnline() });
  } else {
    setStatus({ error: null, online: true });
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// --- public API ----------------------------------------------------------

/** Wire the engine to a backend and do the first pull + push. */
export async function startSync(nextBackend: SyncBackend): Promise<void> {
  stopSync();
  backend = nextBackend;
  running = true;
  setStatus({ enabled: true, online: isOnline(), error: null });

  setMutationHandler(onLocalMutation);
  addForegroundListeners();

  pollTimer = setInterval(() => {
    if (running && isVisible()) requestPull();
  }, POLL_MS);
  (pollTimer as { unref?: () => void }).unref?.();

  const userId = nextBackend.currentUserId();
  if (userId && nextBackend.subscribe) {
    unsubscribeRealtime = nextBackend.subscribe(userId, () => requestPull());
  }

  await syncNow();
}

export function stopSync(): void {
  running = false;
  backend = null;
  queuedPull = false;
  queuedPush = false;
  setMutationHandler(null);
  unsubscribeRealtime?.();
  unsubscribeRealtime = null;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  removeForegroundListeners();
  status = { ...status, syncing: false };
  setStatus({ enabled: false });
}

export async function syncNow(): Promise<void> {
  queuedPull = true;
  queuedPush = true;
  await pump();
}

// --- foreground / connectivity --------------------------------------------

function handleOnline(): void {
  setStatus({ online: true });
  void syncNow();
}

function handleOffline(): void {
  setStatus({ online: false });
}

/**
 * Coming back to the app is the moment stale data is most visible, so treat it
 * as a sync trigger. `pageshow` covers Safari's back/forward cache, which an
 * installed PWA leans on heavily.
 */
function handleForeground(): void {
  if (!running || !isVisible()) return;
  setStatus({ online: isOnline() });
  void syncNow();
}

function addForegroundListeners(): void {
  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("focus", handleForeground);
    window.addEventListener("pageshow", handleForeground);
  }
  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("visibilitychange", handleForeground);
  }
}

function removeForegroundListeners(): void {
  if (typeof window !== "undefined" && window.removeEventListener) {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    window.removeEventListener("focus", handleForeground);
    window.removeEventListener("pageshow", handleForeground);
  }
  if (typeof document !== "undefined" && document.removeEventListener) {
    document.removeEventListener("visibilitychange", handleForeground);
  }
}

/** Test hook — run one push/pull cycle against the backend. */
export async function _cycle(): Promise<void> {
  await syncNow();
}
