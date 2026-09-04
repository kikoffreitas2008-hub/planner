import { useSyncExternalStore } from "react";

import { createEmptyDatabase, SCHEMA_VERSION, type Database, type Row, type Table } from "@/data/db";
import { loadDatabase, saveDatabase } from "@/data/persistence";
import { createClientId } from "@/domain/date";

let db: Database = seed(createEmptyDatabase());
let hydrated = false;

const listeners = new Set<() => void>();
const hydrationListeners = new Set<() => void>();

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
  return {
    ...base,
    meta: { ...base.meta, localUserId },
    user_settings: base.user_settings ?? {
      id: createClientId(),
      user_id: localUserId,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      time_zone: "Europe/Lisbon",
      last_overdue_review_date: null,
      week_starts_on: 1,
      notifications_enabled: false,
      project_progress_visible: true,
      reduce_motion: false,
      default_calendar_view: "month",
      calendar_visible_anchor: null,
    },
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

export function upsertRow<T extends Table>(table: T, row: Row<T>): void {
  const next: TableMap<T> = { ...tableOf(table), [row.id]: row };
  db = { ...db, [table]: next } as Database;
  notify();
}

export function upsertRows<T extends Table>(table: T, rows: readonly Row<T>[]): void {
  if (rows.length === 0) return;
  const next: TableMap<T> = { ...tableOf(table) };
  for (const row of rows) next[row.id] = row;
  db = { ...db, [table]: next } as Database;
  notify();
}

export function removeRow<T extends Table>(table: T, id: string): void {
  const current = tableOf(table);
  if (!(id in current)) return;
  const next: TableMap<T> = { ...current };
  delete next[id];
  db = { ...db, [table]: next } as Database;
  notify();
}

export function setUserSettings(settings: Database["user_settings"]): void {
  db = { ...db, user_settings: settings };
  notify();
}

/** The owning user id for every row created locally. */
export function localUserId(): string {
  return db.meta.localUserId;
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
