import { useSyncExternalStore } from "react";

import { createEmptyDatabase, SCHEMA_VERSION, type Database, type Row, type Table } from "@/data/db";
import { loadDatabase, saveDatabase } from "@/data/persistence";
import { createClientId } from "@/domain/date";

let db: Database = seed(createEmptyDatabase());
let hydrated = false;

const listeners = new Set<() => void>();
const hydrationListeners = new Set<() => void>();

export type MutationEvent = {
  op: "upsert" | "delete";
  table: Table | "user_settings";
  id: string;
};

let mutationHandler: ((event: MutationEvent) => void) | null = null;

/** The sync engine registers here to mirror local writes into the outbox. */
export function setMutationHandler(handler: ((event: MutationEvent) => void) | null): void {
  mutationHandler = handler;
}

/** Other observers (notification scheduling, search re-indexing) add themselves here. */
const mutationListeners = new Set<(event: MutationEvent) => void>();

export function addMutationListener(listener: (event: MutationEvent) => void): () => void {
  mutationListeners.add(listener);
  return () => mutationListeners.delete(listener);
}

function emitMutation(event: MutationEvent, fromSync: boolean): void {
  if (!fromSync) mutationHandler?.(event);
  for (const listener of mutationListeners) listener(event);
}

function notify(): void {
  for (const listener of listeners) listener();
  scheduleSave();
}

// --- persistence (debounced) --------------------------------------------------

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    db = { ...db, meta: { ...db.meta, savedAt: new Date().toISOString() } };
    saveDatabase(db);
  }, 400);
  // Never keep a Node process alive for a pending write (matters in tests).
  (saveTimer as { unref?: () => void }).unref?.();
}

/** Force an immediate write. Useful before the app backgrounds. */
export function flush(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  db = { ...db, meta: { ...db.meta, savedAt: new Date().toISOString() } };
  saveDatabase(db);
}

// --- hydration --------------------------------------------------------------

function seed(base: Database): Database {
  const localUserId = base.meta.localUserId || createClientId();
  const now = new Date().toISOString();
  const defaults = {
    id: createClientId(),
    user_id: localUserId,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    time_zone: "Europe/Lisbon" as const,
    last_overdue_review_date: null,
    week_starts_on: 1 as const,
    notifications_enabled: false,
    project_progress_visible: true,
    reduce_motion: false,
    default_calendar_view: "month" as const,
    calendar_visible_anchor: null,
    today_manual_dates: "[]",
  };
  return {
    ...base,
    meta: { ...base.meta, localUserId },
    // Merge so a database saved before a settings field existed gets the default.
    user_settings: { ...defaults, ...(base.user_settings ?? {}) },
  };
}

/**
 * Load persisted data once at app start. The store is always usable before
 * this runs (it starts empty but valid), so nothing can "write into nothing"
 * the way the previous build did — see blueprint/06 section 5.
 */
export function hydrate(): void {
  if (hydrated) return;
  const loaded = loadDatabase();
  if (loaded && loaded.meta?.schemaVersion === SCHEMA_VERSION) {
    db = seed({ ...createEmptyDatabase(), ...loaded, meta: { ...loaded.meta } });
  }
  hydrated = true;
  for (const listener of hydrationListeners) listener();
  for (const listener of listeners) listener();
}

export function isHydrated(): boolean {
  return hydrated;
}

// --- reads ----------------------------------------------------------------

export function getDatabase(): Database {
  return db;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Subscribe to the whole database. Re-renders on any change. */
export function useDatabase(): Database {
  return useSyncExternalStore(subscribe, getDatabase, getDatabase);
}

type TableMap<T extends Table> = Record<string, Row<T>>;

function tableOf<T extends Table>(table: T): TableMap<T> {
  return db[table] as unknown as TableMap<T>;
}

/**
 * Subscribe to one table. The table object's identity only changes when that
 * table is written, so unrelated mutations do not re-render the consumer.
 */
export function useTable<T extends Table>(table: T): TableMap<T> {
  const get = () => tableOf(table);
  return useSyncExternalStore(subscribe, get, get);
}

export function useUserSettings() {
  const get = () => db.user_settings;
  return useSyncExternalStore(subscribe, get, get);
}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    (listener) => {
      hydrationListeners.add(listener);
      return () => hydrationListeners.delete(listener);
    },
    isHydrated,
    isHydrated,
  );
}

// --- writes -------------------------------------------------------------

export function upsertRow<T extends Table>(table: T, row: Row<T>, fromSync = false): void {
  const next: TableMap<T> = { ...tableOf(table), [row.id]: row };
  db = { ...db, [table]: next } as Database;
  emitMutation({ op: "upsert", table, id: row.id }, fromSync);
  notify();
}

export function upsertRows<T extends Table>(
  table: T,
  rows: readonly Row<T>[],
  fromSync = false,
): void {
  if (rows.length === 0) return;
  const next: TableMap<T> = { ...tableOf(table) };
  for (const row of rows) next[row.id] = row;
  db = { ...db, [table]: next } as Database;
  for (const row of rows) emitMutation({ op: "upsert", table, id: row.id }, fromSync);
  notify();
}

export function removeRow<T extends Table>(table: T, id: string, fromSync = false): void {
  const current = tableOf(table);
  if (!(id in current)) return;
  const next: TableMap<T> = { ...current };
  delete next[id];
  db = { ...db, [table]: next } as Database;
  emitMutation({ op: "delete", table, id }, fromSync);
  notify();
}

export function setUserSettings(settings: Database["user_settings"], fromSync = false): void {
  db = { ...db, user_settings: settings };
  if (settings) emitMutation({ op: "upsert", table: "user_settings", id: settings.id }, fromSync);
  notify();
}

/** The owning user id for every row created locally. */
export function localUserId(): string {
  return db.meta.localUserId;
}

const ALL_TABLES: Table[] = [
  "calendar_items",
  "projects",
  "project_items",
  "routine_lists",
  "routine_items",
  "remember_items",
  "recurrence_exceptions",
  "time_logs",
  "sync_tombstones",
];

/**
 * On the first sign-in, adopt the anonymous local rows for the real account so
 * they sync up. Rows already carrying another `user_id` (pulled from the cloud)
 * are left alone.
 */
export function rekeyLocalUser(userId: string): void {
  const oldId = db.meta.localUserId;
  if (oldId === userId) return;
  const now = new Date().toISOString();
  const next: Database = { ...db, meta: { ...db.meta, localUserId: userId } };

  for (const table of ALL_TABLES) {
    const map = { ...(next[table] as Record<string, { user_id: string; updated_at: string }>) };
    for (const id of Object.keys(map)) {
      if (map[id].user_id === oldId) map[id] = { ...map[id], user_id: userId, updated_at: now };
    }
    (next as unknown as Record<string, unknown>)[table] = map;
  }
  if (next.user_settings && next.user_settings.user_id === oldId) {
    next.user_settings = { ...next.user_settings, user_id: userId, updated_at: now };
  }
  db = next;

  for (const table of ALL_TABLES) {
    for (const id of Object.keys(db[table] as object)) {
      emitMutation({ op: "upsert", table, id }, false);
    }
  }
  if (db.user_settings) {
    emitMutation({ op: "upsert", table: "user_settings", id: db.user_settings.id }, false);
  }
  notify();
}

// --- test / dev helpers ---------------------------------------------------

/** Replace the entire database. Only for tests and a future account switch. */
export function replaceDatabase(next: Database): void {
  db = next;
  hydrated = true;
  notify();
}

export function resetDatabaseForTests(): void {
  db = seed(createEmptyDatabase());
  hydrated = true;
}

// Hydrate as soon as this module loads. On web `localStorage` is synchronous,
// so persisted data is in place before React renders — no empty first frame,
// no "write into nothing" window. Guarded for the Node static-render pass.
hydrate();
