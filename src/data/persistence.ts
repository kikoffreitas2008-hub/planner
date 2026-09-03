import type { Database } from "@/data/db";

const STORAGE_KEY = "planner.db.v1";

/**
 * Local persistence for M1-M3. Web (including the installed iPhone PWA) uses
 * `localStorage`, which is synchronous and survives reloads. A real native
 * build has no `localStorage`; that path gets `expo-file-system` or
 * AsyncStorage when a native build actually exists (post-M5, paid Apple
 * account). Until then native simply runs in memory.
 *
 * All access is guarded: Expo Router static-renders the web build in Node
 * during `expo export`, where `window` does not exist.
 */

function storage(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Access to localStorage can throw (private mode, disabled storage).
  }
  return null;
}

export function loadDatabase(): Database | null {
  const store = storage();
  if (!store) return null;
  const raw = store.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Database;
  } catch {
    return null;
  }
}

export function saveDatabase(db: Database): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Quota or serialization failure — nothing actionable locally.
  }
}

export function clearDatabase(): void {
  storage()?.removeItem(STORAGE_KEY);
}
