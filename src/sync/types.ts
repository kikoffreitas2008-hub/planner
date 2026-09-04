export type SyncTableName =
  | "calendar_items"
  | "projects"
  | "project_items"
  | "routine_lists"
  | "routine_items"
  | "remember_items"
  | "recurrence_exceptions"
  | "user_settings"
  | "sync_tombstones";

export const SYNC_TABLES: readonly SyncTableName[] = [
  "user_settings",
  "projects",
  "project_items",
  "calendar_items",
  "recurrence_exceptions",
  "routine_lists",
  "routine_items",
  "remember_items",
  "sync_tombstones",
];

export interface SyncRow {
  id: string;
  user_id: string;
  updated_at: string;
  deleted_at: string | null;
  [key: string]: unknown;
}

export interface OutboxEntry {
  table: SyncTableName;
  id: string;
  row: SyncRow;
  updated_at: string;
  attempts: number;
}

export interface PullResult {
  rows: SyncRow[];
  /** ISO timestamp to store as the new cursor for this table. */
  cursor: string;
}

export interface SyncBackend {
  currentUserId(): string | null;
  pushRows(table: SyncTableName, rows: readonly SyncRow[]): Promise<void>;
  pullRows(table: SyncTableName, since: string | null): Promise<PullResult>;
  subscribe?(userId: string, onChange: () => void): () => void;
}
