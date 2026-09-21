import type { SupabaseClient } from "@supabase/supabase-js";

import type { SyncBackend, SyncRow } from "@/sync/types";

const EPOCH = new Date(0).toISOString();
const PAGE = 1000;

export function createSupabaseBackend(client: SupabaseClient, userId: string): SyncBackend {
  return {
    currentUserId: () => userId,

    async pushRows(table, rows) {
      if (rows.length === 0) return;
      // Each table stores the sync columns plus a `data` jsonb blob.
      const payload = rows.map(({ id, user_id, updated_at, deleted_at, ...rest }) => ({
        id,
        user_id,
        updated_at,
        deleted_at,
        data: rest,
      }));
      const { error } = await client.from(table).upsert(payload, { onConflict: "id" });
      if (error) throw new Error(`push ${table}: ${error.message}`);
    },

    async pullRows(table, since) {
      let query = client
        .from(table)
        .select("id,user_id,updated_at,deleted_at,data")
        .order("updated_at", { ascending: true })
        .limit(PAGE);
      // `gte`, not `gt`: the cursor is the newest `updated_at` we have seen, and
      // another device may have written a row at that very instant. With a
      // strict `>` such a row is skipped for good. Re-reading the boundary row
      // costs nothing — applying it again is a no-op under last-write-wins.
      if (since) query = query.gte("updated_at", since);

      const { data, error } = await query;
      if (error) throw new Error(`pull ${table}: ${error.message}`);

      const raw = (data ?? []) as {
        id: string;
        user_id: string;
        updated_at: string;
        deleted_at: string | null;
        data: Record<string, unknown> | null;
      }[];
      const rows: SyncRow[] = raw.map((entry) => ({
        ...(entry.data ?? {}),
        id: entry.id,
        user_id: entry.user_id,
        updated_at: entry.updated_at,
        deleted_at: entry.deleted_at,
      }));
      const cursor = rows.length ? rows[rows.length - 1].updated_at : (since ?? EPOCH);
      return { rows, cursor, hasMore: raw.length >= PAGE };
    },

    subscribe(_userId, onChange) {
      const channel = client
        .channel("planner-sync")
        .on("postgres_changes", { event: "*", schema: "public" }, () => onChange())
        .subscribe((status) => {
          // Also pull whenever the socket (re)connects: anything that changed
          // while it was down produced no event, so only a catch-up pull with
          // the stored cursor will bring those rows in.
          if (status === "SUBSCRIBED") onChange();
        });
      return () => {
        void client.removeChannel(channel);
      };
    },
  };
}
