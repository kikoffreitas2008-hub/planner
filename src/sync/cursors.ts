import type { SyncTableName } from "@/sync/types";

const KEY = "planner.sync.cursors.v1";

type Cursors = Partial<Record<SyncTableName, string>>;

function storage(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  } catch {
    /* ignore */
  }
  return null;
}

let mem: Cursors = read();

function read(): Cursors {
  const raw = storage()?.getItem(KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Cursors;
  } catch {
    return {};
  }
}

export function getCursor(table: SyncTableName): string | null {
  return mem[table] ?? null;
}

export function setCursor(table: SyncTableName, cursor: string): void {
  mem[table] = cursor;
  storage()?.setItem(KEY, JSON.stringify(mem));
}

export function lastSyncAt(): string | null {
  const values = Object.values(mem).filter((value): value is string => Boolean(value));
  return values.length ? values.sort()[values.length - 1] : null;
}

export function clearCursors(): void {
  mem = {};
  storage()?.removeItem(KEY);
}

/** Test hook. */
export function _reset(): void {
  mem = {};
}
