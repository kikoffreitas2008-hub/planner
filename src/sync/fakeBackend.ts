import type { SyncBackend, SyncRow, SyncTableName } from "@/sync/types";

/**
 * An in-memory stand-in for the Supabase backend, used by the sync tests. The
 * `server` handle lets a test act as a second device.
 */
export function createFakeBackend(userId: string) {
  const tables = new Map<SyncTableName, Map<string, SyncRow>>();
  let online = true;
  let listener: (() => void) | null = null;

  function table(name: SyncTableName): Map<string, SyncRow> {
    let map = tables.get(name);
    if (!map) {
      map = new Map();
      tables.set(name, map);
    }
    return map;
  }

  const backend: SyncBackend = {
    currentUserId: () => userId,
    async pushRows(name, rows) {
      if (!online) throw new Error("offline");
      const map = table(name);
      for (const row of rows) map.set(row.id, { ...row });
      listener?.();
    },
    async pullRows(name, since) {
      if (!online) throw new Error("offline");
      const rows = [...table(name).values()]
        .filter((row) => !since || row.updated_at > since)
        .sort((a, b) => a.updated_at.localeCompare(b.updated_at));
      const cursor = rows.length ? rows[rows.length - 1].updated_at : (since ?? "");
      return { rows: rows.map((row) => ({ ...row })), cursor };
    },
    subscribe(_userId, onChange) {
      listener = onChange;
      return () => {
        listener = null;
      };
    },
  };

  return {
    backend,
    server: {
      put(name: SyncTableName, row: SyncRow) {
        table(name).set(row.id, { ...row });
      },
      get(name: SyncTableName, id: string) {
        return table(name).get(id);
      },
      all(name: SyncTableName) {
        return [...table(name).values()];
      },
      setOnline(value: boolean) {
        online = value;
      },
    },
  };
}
