import type {
  CalendarItem,
  Project,
  ProjectItem,
  RecurrenceException,
  RememberItem,
  RoutineItem,
  RoutineList,
  SyncTombstone,
  UserSettings,
} from "@/domain/entities";

/** Every keyed table in the local store. */
export type Table =
  | "calendar_items"
  | "projects"
  | "project_items"
  | "routine_lists"
  | "routine_items"
  | "remember_items"
  | "recurrence_exceptions"
  | "sync_tombstones";

export type Row<T extends Table> = {
  calendar_items: CalendarItem;
  projects: Project;
  project_items: ProjectItem;
  routine_lists: RoutineList;
  routine_items: RoutineItem;
  remember_items: RememberItem;
  recurrence_exceptions: RecurrenceException;
  sync_tombstones: SyncTombstone;
}[T];

export const SCHEMA_VERSION = 1;

export interface Database {
  meta: {
    schemaVersion: number;
    /**
     * A client-generated UUID that owns every local row until a real account
     * arrives in M4. At that point rows are re-keyed to the authenticated
     * user id. Nothing in M1-M3 depends on this being a server value.
     */
    localUserId: string;
    /** ISO timestamp of the last successful local persist. */
    savedAt: string | null;
  };
  user_settings: UserSettings | null;
  calendar_items: Record<string, CalendarItem>;
  projects: Record<string, Project>;
  project_items: Record<string, ProjectItem>;
  routine_lists: Record<string, RoutineList>;
  routine_items: Record<string, RoutineItem>;
  remember_items: Record<string, RememberItem>;
  recurrence_exceptions: Record<string, RecurrenceException>;
  sync_tombstones: Record<string, SyncTombstone>;
}

export function createEmptyDatabase(): Database {
  return {
    meta: { schemaVersion: SCHEMA_VERSION, localUserId: "", savedAt: null },
    user_settings: null,
    calendar_items: {},
    projects: {},
    project_items: {},
    routine_lists: {},
    routine_items: {},
    remember_items: {},
    recurrence_exceptions: {},
    sync_tombstones: {},
  };
}
