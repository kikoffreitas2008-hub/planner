import type { ISODate, ISODateTime } from "./date";
import type { AgendaOrigin, PaletteColor } from "./entities";
import type { RecurrenceRule } from "./recurrence";

export interface AgendaItem {
  allDay: boolean;
  color: PaletteColor;
  completedAt: ISODateTime | null;
  createdAt: ISODateTime;
  date: ISODate;
  deletedAt: ISODateTime | null;
  endsAt: ISODateTime | null;
  itemKind: "task" | "event";
  location?: string | null;
  notes: string | null;
  notificationOffsets?: readonly number[];
  occurrenceId: string;
  origin: AgendaOrigin;
  recurrenceRule: string | null;
  startsAt: ISODateTime | null;
  title: string;
}

export interface NewAgendaItemInput {
  allDay: boolean;
  color: PaletteColor;
  date: ISODate;
  endsAt: ISODateTime | null;
  itemType: "task" | "event";
  location?: string | null;
  notes: string | null;
  notificationOffsets?: readonly number[] | null;
  recurrenceRule?: RecurrenceRule | null;
  startsAt: ISODateTime | null;
  title: string;
}

function group(item: AgendaItem) {
  if (!item.completedAt) return item.allDay ? 0 : 1;
  return item.allDay ? 2 : 3;
}

function compareNullable(left: string | null, right: string | null) {
  return (left ?? "").localeCompare(right ?? "");
}

export function compareAgendaItems(left: AgendaItem, right: AgendaItem) {
  const groupDifference = group(left) - group(right);
  if (groupDifference) return groupDifference;

  if (!left.completedAt && !right.completedAt && !left.allDay) {
    const startDifference = compareNullable(left.startsAt, right.startsAt);
    if (startDifference) return startDifference;
  }
  if (left.completedAt && right.completedAt) {
    const completionDifference = left.completedAt.localeCompare(
      right.completedAt,
    );
    if (completionDifference) return completionDifference;
    if (!left.allDay) {
      const startDifference = compareNullable(left.startsAt, right.startsAt);
      if (startDifference) return startDifference;
    }
  }
  const createdDifference = left.createdAt.localeCompare(right.createdAt);
  return (
    createdDifference || left.occurrenceId.localeCompare(right.occurrenceId)
  );
}

export function prepareAgenda(items: readonly AgendaItem[]) {
  const unique = new Map<string, AgendaItem>();
  for (const item of items) {
    if (!item.deletedAt && !unique.has(item.occurrenceId)) {
      unique.set(item.occurrenceId, item);
    }
  }
  return [...unique.values()].sort(compareAgendaItems);
}
