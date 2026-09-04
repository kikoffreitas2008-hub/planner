import { useMemo } from "react";

import { useTable } from "@/data/store";
import type { AgendaItem } from "@/domain/agenda";
import { prepareAgenda } from "@/domain/agenda";
import type { ISODate } from "@/domain/date";
import type { CalendarItem } from "@/domain/entities";
import { occurrencesForDate, type RecurrenceRule, type RecurringSource } from "@/domain/recurrence";

function parseOffsets(value: string | null): readonly number[] | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((n) => Number.isFinite(n)) : undefined;
  } catch {
    return undefined;
  }
}

function toRecurringSource(item: CalendarItem, rule: RecurrenceRule): RecurringSource {
  return {
    allDay: item.all_day,
    color: item.color,
    completedAt: item.completed_at,
    createdAt: item.created_at,
    date: item.date,
    endsAt: item.ends_at,
    id: item.id,
    itemKind: item.item_type,
    location: item.item_type === "event" ? item.location : null,
    notes: item.notes,
    notificationOffsets: parseOffsets(item.notification_offsets),
    recurrenceRule: rule,
    startsAt: item.starts_at,
    title: item.title,
    userId: item.user_id,
  };
}

function baseAgendaItem(item: CalendarItem): Omit<AgendaItem, "date" | "occurrenceId" | "startsAt" | "endsAt"> {
  return {
    allDay: item.all_day,
    color: item.color,
    completedAt: item.completed_at,
    createdAt: item.created_at,
    deletedAt: item.deleted_at,
    itemKind: item.item_type,
    location: item.item_type === "event" ? item.location : null,
    notes: item.notes,
    notificationOffsets: parseOffsets(item.notification_offsets),
    origin: { kind: "calendar", id: item.id },
    recurrenceRule: item.recurrence_rule,
    title: item.title,
  };
}

/** One non-recurring calendar item as an agenda entry. */
export function calendarAgendaItem(item: CalendarItem): AgendaItem {
  return {
    ...baseAgendaItem(item),
    date: item.date,
    occurrenceId: item.id,
    startsAt: item.starts_at,
    endsAt: item.ends_at,
  };
}

/** Expand one calendar item onto a single date (0 or 1 entries). */
function expandForDate(item: CalendarItem, date: ISODate): AgendaItem[] {
  if (item.deleted_at) return [];

  if (!item.recurrence_rule) {
    if (item.date !== date) return [];
    return [calendarAgendaItem(item)];
  }

  let rule: RecurrenceRule;
  try {
    rule = JSON.parse(item.recurrence_rule) as RecurrenceRule;
  } catch {
    return [];
  }

  return occurrencesForDate(toRecurringSource(item, rule), date, []).map((occurrence) => ({
    ...baseAgendaItem(item),
    date: occurrence.date,
    occurrenceId: occurrence.occurrenceId,
    startsAt: occurrence.startsAt,
    endsAt: occurrence.endsAt,
    completedAt: occurrence.completedAt,
    title: occurrence.title,
    notes: occurrence.notes,
    allDay: occurrence.allDay,
    color: occurrence.color,
  }));
}

/**
 * The single derived list that Today and Calendar both render. In M1 it is
 * built from `calendar_items` only; scheduled project items join in M2
 * (blueprint/04 section 3).
 */
export function useDayAgenda(date: ISODate): readonly AgendaItem[] {
  const calendarItems = useTable("calendar_items");

  return useMemo(() => {
    const expanded = Object.values(calendarItems).flatMap((item) => expandForDate(item, date));
    return prepareAgenda(expanded);
  }, [calendarItems, date]);
}
