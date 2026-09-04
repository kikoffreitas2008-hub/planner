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

let backend: SyncBackend | null = null;
let unsubscribeRealtime: (() => void) | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let running = false;
let pullQueued = false;

function isOnline(): boolean {
  try {
    return typeof navigator === "undefined" ? true : navigator.onLine !== false;
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
    void pushOnce();
  }, delayMs);
  (pushTimer as { unref?: () => void }).unref?.();
}

async function pushOnce(): Promise<void> {
  if (!backend || !running || !isOnline()) return;
  const entries = pending();
  if (entries.length === 0) return;

  setStatus({ syncing: true });
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

  setStatus({ syncing: false });
  if (failed) {
    const attempts = pending()[0]?.attempts ?? 1;
    schedulePush(Math.min(60_000, 1000 * 2 ** Math.min(attempts, 6)));
  } else {
    setStatus({ error: null });
  }
}

async function pullOnce(): Promise<void> {
  if (!backend || !running || !isOnline()) return;
  if (status.syncing) {
    pullQueued = true;
    return;
  }
  setStatus({ syncing: true });
  const activeBackend = backend;
  try {
    for (const table of SYNC_TABLES) {
      const result = await activeBackend.pullRows(table, getCursor(table));
      // The engine may have been stopped or re-pointed while awaiting.
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
    }
    setStatus({ error: null, online: true });
  } catch (error) {
    setStatus({ error: describe(error), online: isOnline() });
  } finally {
    setStatus({ syncing: false });
    if (pullQueued) {
      pullQueued = false;
      void pullOnce();
    }
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

  if (typeof window !== "undefined" && window.addEventListener) {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  }

  const userId = nextBackend.currentUserId();
  if (userId && nextBackend.subscribe) {
    unsubscribeRealtime = nextBackend.subscribe(userId, () => void pullOnce());
  }

  await pullOnce();
  await pushOnce();
}

export function stopSync(): void {
  running = false;
  backend = null;
  pullQueued = false;
  setMutationHandler(null);
  unsubscribeRealtime?.();
  unsubscribeRealtime = null;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  status = { ...status, syncing: false };
  if (typeof window !== "undefined" && window.removeEventListener) {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  }
  setStatus({ enabled: false });
}

export async function syncNow(): Promise<void> {
  await pullOnce();
  await pushOnce();
}

function handleOnline(): void {
  setStatus({ online: true });
  void syncNow();
}

function handleOffline(): void {
  setStatus({ online: false });
}

/** Test hook — run one push/pull cycle synchronously-ish against the backend. */
export async function _cycle(): Promise<void> {
  await pushOnce();
  await pullOnce();
}
