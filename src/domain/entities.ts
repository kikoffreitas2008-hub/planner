import type { ISODate, ISODateTime } from "./date.ts";

export type EntityId = string;
export type PaletteColor =
  "blue" | "green" | "pink" | "purple" | "red" | "orange" | "yellow";

export interface SyncEntity {
  id: EntityId;
  user_id: EntityId;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  deleted_at: ISODateTime | null;
}

export interface Profile extends SyncEntity {
  display_name: string | null;
  avatar_url: string | null;
  locale: "pt-PT";
}

export interface UserSettings extends SyncEntity {
  time_zone: string;
  last_overdue_review_date: ISODate | null;
  week_starts_on: 1;
  notifications_enabled: boolean;
  project_progress_visible: boolean;
  reduce_motion: boolean;
  default_calendar_view: "month" | "week" | "day";
  calendar_visible_anchor: ISODate | null;
}

interface CalendarItemBase extends SyncEntity {
  title: string;
  notes: string | null;
  date: ISODate;
  starts_at: ISODateTime | null;
  ends_at: ISODateTime | null;
  all_day: boolean;
  completed_at: ISODateTime | null;
  color: PaletteColor;
  recurrence_rule: string | null;
  notification_offsets: string | null;
  series_started_at: ISODateTime | null;
  manual_sort_key: string;
}

export type CalendarItem =
  | (CalendarItemBase & {
      item_type: "task";
      location: null;
    })
  | (CalendarItemBase & {
      item_type: "event";
      location: string | null;
    });

interface ProjectBase extends SyncEntity {
  title: string;
  color: PaletteColor;
  archived_at: ISODateTime | null;
  manual_sort_key: string;
  order_mode: "importance_default" | "manual";
}

type ProjectMode = { mode: "simple" } | { mode: "structured" };

type ProgressMode = { progress_mode: "items" } | { progress_mode: "time" };

export type Project = ProjectBase & ProjectMode & ProgressMode;

interface ProjectItemBase extends SyncEntity {
  project_id: EntityId;
  parent_id: EntityId | null;
  title: string;
  estimated_minutes: number | null;
  notes: string | null;
  completed_at: ISODateTime | null;
  manual_sort_key: string;
  scheduled_date: ISODate | null;
  scheduled_all_day: boolean;
  scheduled_starts_at: ISODateTime | null;
  scheduled_ends_at: ISODateTime | null;
}

type Importance =
  | { importance: null }
  | { importance: "low" }
  | { importance: "medium" }
  | { importance: "high" };

export type ProjectItem = ProjectItemBase & Importance;

export interface RoutineList extends SyncEntity {
  title: string;
  archived_at: ISODateTime | null;
  manual_sort_key: string;
}

export interface RoutineItem extends SyncEntity {
  routine_list_id: EntityId;
  title: string;
  completed_at: ISODateTime | null;
  manual_sort_key: string;
}

export interface RememberItem extends SyncEntity {
  date: ISODate;
  title: string;
  color: PaletteColor;
  manual_sort_key: string;
}

interface RecurrenceExceptionBase extends SyncEntity {
  origin_id: EntityId;
  occurrence_date: ISODate;
}

export type RecurrenceException =
  | (RecurrenceExceptionBase & {
      exception_type: "cancelled";
      replacement_json: null;
    })
  | (RecurrenceExceptionBase & {
      exception_type: "modified";
      replacement_json: string;
    });

export type RecurrenceScope =
  | { scope: "occurrence"; occurrence_date: ISODate }
  | { scope: "following"; occurrence_date: ISODate }
  | { scope: "series" };

export interface SyncTombstone {
  id: EntityId;
  user_id: EntityId;
  entity_type: string;
  entity_id: EntityId;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  deleted_at: ISODateTime;
  committed_at: ISODateTime | null;
  expires_at: ISODateTime;
}

export type AgendaOrigin =
  | { kind: "calendar"; id: EntityId }
  | {
      kind: "project";
      id: EntityId;
      projectId: EntityId;
      projectTitle?: string;
    };
