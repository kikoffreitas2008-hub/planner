import { generateKeyBetween } from "fractional-indexing";

import type { Row, Table } from "@/data/db";
import { getDatabase, localUserId, removeRow, setUserSettings, upsertRow } from "@/data/store";
import { createClientId, type ISODate, type ISODateTime } from "@/domain/date";
import type {
  CalendarItem,
  PaletteColor,
  RememberItem,
  RoutineItem,
  RoutineList,
  UserSettings,
} from "@/domain/entities";

function nowISO(): ISODateTime {
  return new Date().toISOString();
}

function nextSortKey(table: Table): string {
  const keys = Object.values(getDatabase()[table])
    .map((row) => (row as { manual_sort_key?: string }).manual_sort_key)
    .filter((key): key is string => typeof key === "string")
    .sort();
  const last = keys.length ? keys[keys.length - 1] : null;
  return generateKeyBetween(last, null);
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
