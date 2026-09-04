import { generateKeyBetween } from "fractional-indexing";

import type { Row, Table } from "@/data/db";
import { getDatabase, localUserId, removeRow, setUserSettings, upsertRow } from "@/data/store";
import { createClientId, type ISODate, type ISODateTime } from "@/domain/date";
import type {
  CalendarItem,
  PaletteColor,
  Project,
  ProjectItem,
  RememberItem,
  RoutineItem,
  RoutineList,
  UserSettings,
} from "@/domain/entities";

function nowISO(): ISODateTime {
  return new Date().toISOString();
}

function sortKeyAfterKeys(keys: readonly string[]): string {
  const sorted = [...keys].sort();
  return generateKeyBetween(sorted.length ? sorted[sorted.length - 1] : null, null);
}

function nextSortKey(table: Table): string {
  const keys = Object.values(getDatabase()[table])
    .map((row) => (row as { manual_sort_key?: string }).manual_sort_key)
    .filter((key): key is string => typeof key === "string");
  return sortKeyAfterKeys(keys);
}

function base(table: Table) {
  const timestamp = nowISO();
  return {
    id: createClientId(),
    user_id: localUserId(),
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
    manual_sort_key: nextSortKey(table),
  };
}

function touch<T extends Table>(table: T, id: string, patch: Partial<Row<T>>): void {
  const current = getDatabase()[table][id];
  if (!current) return;
  upsertRow(table, { ...current, ...patch, updated_at: nowISO() } as Row<T>);
}

// --- calendar items (tasks and events) ----------------------------------

export interface NewCalendarItem {
  item_type: "task" | "event";
  title: string;
  notes?: string | null;
  date: ISODate;
  starts_at?: ISODateTime | null;
  ends_at?: ISODateTime | null;
  all_day?: boolean;
  color?: PaletteColor;
  location?: string | null;
  recurrence_rule?: string | null;
  notification_offsets?: string | null;
}

export const calendarItems = {
  create(input: NewCalendarItem): CalendarItem {
    const shared = {
      ...base("calendar_items"),
      title: input.title.trim(),
      notes: input.notes?.trim() ? input.notes.trim() : null,
      date: input.date,
      starts_at: input.starts_at ?? null,
      ends_at: input.ends_at ?? null,
      all_day: input.all_day ?? false,
      completed_at: null,
      color: input.color ?? "blue",
      recurrence_rule: input.recurrence_rule ?? null,
      notification_offsets: input.notification_offsets ?? null,
      series_started_at: null,
    };
    const row: CalendarItem =
      input.item_type === "event"
        ? { ...shared, item_type: "event", location: input.location ?? null }
        : { ...shared, item_type: "task", location: null };
    upsertRow("calendar_items", row);
    return row;
  },

  update(id: string, patch: Partial<CalendarItem>): void {
    touch("calendar_items", id, patch);
  },

  setCompleted(id: string, completed: boolean): void {
    touch("calendar_items", id, { completed_at: completed ? nowISO() : null });
  },

  setColor(id: string, color: PaletteColor): void {
    touch("calendar_items", id, { color });
  },

  softDelete(id: string): void {
    touch("calendar_items", id, { deleted_at: nowISO() });
  },

  restore(id: string): void {
    touch("calendar_items", id, { deleted_at: null });
  },

  /** Permanently drop a row and leave a tombstone for sync (M4). */
  purge(id: string): void {
    const row = getDatabase().calendar_items[id];
    if (!row) return;
    const timestamp = nowISO();
    upsertRow("sync_tombstones", {
      id: createClientId(),
      user_id: localUserId(),
      entity_type: "calendar_items",
      entity_id: id,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: timestamp,
      committed_at: null,
      expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    });
    removeRow("calendar_items", id);
  },
};

// --- routine ---------------------------------------------------------

export const routine = {
  createList(title: string): RoutineList {
    const row: RoutineList = {
      ...base("routine_lists"),
      title: title.trim(),
      archived_at: null,
    };
    upsertRow("routine_lists", row);
    return row;
  },

  /** The single Morning Routine list, created on first use. */
  ensureDefaultList(): RoutineList {
    const existing = Object.values(getDatabase().routine_lists).find(
      (list) => !list.deleted_at && !list.archived_at,
    );
    return existing ?? routine.createList("Morning Routine");
  },

  addItem(listId: string, title: string): RoutineItem {
    const row: RoutineItem = {
      ...base("routine_items"),
      routine_list_id: listId,
      title: title.trim(),
      completed_at: null,
    };
    upsertRow("routine_items", row);
    return row;
  },

  setChecked(id: string, checked: boolean): void {
    touch("routine_items", id, { completed_at: checked ? nowISO() : null });
  },

  resetList(listId: string): void {
    const items = Object.values(getDatabase().routine_items).filter(
      (item) => item.routine_list_id === listId && !item.deleted_at && item.completed_at,
    );
    for (const item of items) touch("routine_items", item.id, { completed_at: null });
  },

  softDeleteItem(id: string): void {
    touch("routine_items", id, { deleted_at: nowISO() });
  },

  restoreItem(id: string): void {
    touch("routine_items", id, { deleted_at: null });
  },
};

// --- remember ---------------------------------------------------------

export const remember = {
  create(date: ISODate, title: string, color: PaletteColor = "yellow"): RememberItem {
    const row: RememberItem = {
      ...base("remember_items"),
      date,
      title: title.trim(),
      color,
    };
    upsertRow("remember_items", row);
    return row;
  },

  update(id: string, patch: Partial<RememberItem>): void {
    touch("remember_items", id, patch);
  },

  softDelete(id: string): void {
    touch("remember_items", id, { deleted_at: nowISO() });
  },

  restore(id: string): void {
    touch("remember_items", id, { deleted_at: null });
  },
};

// --- projects ------------------------------------------------------------

export interface NewProject {
  title: string;
  mode: "simple" | "structured";
  color: PaletteColor;
  progress_mode: "items" | "time";
}

export const projects = {
  create(input: NewProject): Project {
    const row = {
      ...base("projects"),
      title: input.title.trim(),
      mode: input.mode,
      color: input.color,
      progress_mode: input.progress_mode,
      order_mode: "importance_default" as const,
      archived_at: null,
    } as Project;
    upsertRow("projects", row);
    return row;
  },

  update(id: string, patch: Partial<Project>): void {
    touch("projects", id, patch as Partial<Row<"projects">>);
  },

  archive(id: string): void {
    touch("projects", id, { archived_at: nowISO() });
  },

  restore(id: string): void {
    touch("projects", id, { archived_at: null });
  },

  restoreImportanceOrder(id: string): void {
    touch("projects", id, { order_mode: "importance_default" });
  },

  /** Permanent delete: the project, its items, and a tombstone (blueprint/01 §4.6). */
  purge(id: string): void {
    const project = getDatabase().projects[id];
    if (!project) return;
    for (const item of Object.values(getDatabase().project_items)) {
      if (item.project_id === id) removeRow("project_items", item.id);
    }
    const timestamp = nowISO();
    upsertRow("sync_tombstones", {
      id: createClientId(),
      user_id: localUserId(),
      entity_type: "projects",
      entity_id: id,
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: timestamp,
      committed_at: null,
      expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    });
    removeRow("projects", id);
  },
};

// --- project items (tasks and subtasks) --------------------------------

export interface NewProjectItem {
  title: string;
  importance?: ProjectItem["importance"];
  estimated_minutes?: number | null;
  notes?: string | null;
}

export interface ScheduleInput {
  scheduled_date: ISODate | null;
  scheduled_all_day: boolean;
  scheduled_starts_at: ISODateTime | null;
  scheduled_ends_at: ISODateTime | null;
}

function projectItemSortKey(projectId: string, parentId: string | null): string {
  const keys = Object.values(getDatabase().project_items)
    .filter((item) => item.project_id === projectId && item.parent_id === parentId && !item.deleted_at)
    .map((item) => item.manual_sort_key);
  return sortKeyAfterKeys(keys);
}

export const projectItems = {
  create(projectId: string, parentId: string | null, input: NewProjectItem): ProjectItem {
    const row = {
      ...base("project_items"),
      manual_sort_key: projectItemSortKey(projectId, parentId),
      project_id: projectId,
      parent_id: parentId,
      title: input.title.trim(),
      importance: input.importance ?? null,
      estimated_minutes: input.estimated_minutes ?? null,
      notes: input.notes?.trim() ? input.notes.trim() : null,
      completed_at: null,
      scheduled_date: null,
      scheduled_all_day: false,
      scheduled_starts_at: null,
      scheduled_ends_at: null,
    } as ProjectItem;
    upsertRow("project_items", row);
    return row;
  },

  update(id: string, patch: Partial<ProjectItem>): void {
    touch("project_items", id, patch as Partial<Row<"project_items">>);
  },

  setCompleted(id: string, completed: boolean): void {
    touch("project_items", id, { completed_at: completed ? nowISO() : null });
  },

  setImportance(id: string, importance: ProjectItem["importance"]): void {
    touch("project_items", id, { importance } as Partial<Row<"project_items">>);
  },

  setEstimate(id: string, minutes: number | null): void {
    touch("project_items", id, { estimated_minutes: minutes });
  },

  schedule(id: string, input: ScheduleInput): void {
    touch("project_items", id, input);
  },

  unschedule(id: string): void {
    touch("project_items", id, {
      scheduled_date: null,
      scheduled_all_day: false,
      scheduled_starts_at: null,
      scheduled_ends_at: null,
    });
  },

  /** Persist a manual order (fractional keys) and switch the project off importance. */
  applyOrder(projectId: string, orderedIds: readonly string[]): void {
    let previous: string | null = null;
    for (const id of orderedIds) {
      const key = generateKeyBetween(previous, null);
      touch("project_items", id, { manual_sort_key: key });
      previous = key;
    }
    touch("projects", projectId, { order_mode: "manual" });
  },

  softDelete(id: string): void {
    touch("project_items", id, { deleted_at: nowISO() });
  },

  restore(id: string): void {
    touch("project_items", id, { deleted_at: null });
  },

  purge(id: string): void {
    const item = getDatabase().project_items[id];
    if (!item) return;
    for (const child of Object.values(getDatabase().project_items)) {
      if (child.parent_id === id) removeRow("project_items", child.id);
    }
    removeRow("project_items", id);
  },
};

// --- user settings --------------------------------------------------------

export const settings = {
  update(patch: Partial<UserSettings>): void {
    const current = getDatabase().user_settings;
    if (!current) return;
    setUserSettings({ ...current, ...patch, updated_at: nowISO() });
  },

  markOverdueReviewed(date: ISODate): void {
    settings.update({ last_overdue_review_date: date });
  },
};
