import { useMemo } from "react";

import { useTable, useUserSettings } from "@/data/store";
import type { AgendaItem } from "@/domain/agenda";
import { compareAgendaItems } from "@/domain/agenda";
import type { ISODate } from "@/domain/date";
import type { CalendarItem, Project, ProjectItem, RecurrenceException } from "@/domain/entities";
import { occurrencesForDate, type RecurrenceRule, type RecurringSource } from "@/domain/recurrence";

const NO_EXCEPTIONS: readonly RecurrenceException[] = [];

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
    manualSortKey: item.manual_sort_key,
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
function expandForDate(
  item: CalendarItem,
  date: ISODate,
  exceptions: readonly RecurrenceException[] = NO_EXCEPTIONS,
): AgendaItem[] {
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

  return occurrencesForDate(toRecurringSource(item, rule), date, exceptions).map((occurrence) => ({
    ...baseAgendaItem(item),
    date: occurrence.date,
    occurrenceId: occurrence.occurrenceId,
    startsAt: occurrence.startsAt,
    endsAt: occurrence.endsAt,
    completedAt: occurrence.completedAt,
    title: occurrence.title,
    notes: occurrence.notes,
    location: occurrence.location ?? null,
    allDay: occurrence.allDay,
    color: occurrence.color,
  }));
}

function eachDate(start: ISODate, end: ISODate): ISODate[] {
  const dates: ISODate[] = [];
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10) as ISODate);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

/** A scheduled project item as an agenda entry (colour and title from the project). */
export function projectItemAgendaItem(item: ProjectItem, project: Project): AgendaItem {
  return {
    allDay: item.scheduled_all_day,
    color: project.color,
    completedAt: item.completed_at,
    createdAt: item.created_at,
    date: item.scheduled_date as ISODate,
    deletedAt: item.deleted_at,
    endsAt: item.scheduled_ends_at,
    itemKind: "task",
    location: null,
    manualSortKey: item.manual_sort_key,
    notes: item.notes,
    occurrenceId: item.id,
    origin: {
      kind: "project",
      id: item.id,
      projectId: item.project_id,
      projectTitle: project.title,
    },
    recurrenceRule: null,
    startsAt: item.scheduled_starts_at,
    title: item.title,
  };
}

/**
 * The single derived list that Today and Calendar both render. It merges
 * `calendar_items` with `project_items` that carry a `scheduled_date`
 * (blueprint/04 section 3). Nothing is copied — an edit writes back to the
 * record the entry came from.
 */
function dayGroup(item: AgendaItem): number {
  if (!item.completedAt) return item.allDay ? 0 : 1;
  return item.allDay ? 2 : 3;
}

/** Manual order: same grouping as the default, but the middle is by drag key. */
function compareManual(left: AgendaItem, right: AgendaItem): number {
  const groupDiff = dayGroup(left) - dayGroup(right);
  if (groupDiff) return groupDiff;
  const keyDiff = (left.manualSortKey ?? "").localeCompare(right.manualSortKey ?? "");
  if (keyDiff) return keyDiff;
  return left.createdAt.localeCompare(right.createdAt) || left.occurrenceId.localeCompare(right.occurrenceId);
}

function activeExceptions(
  exceptions: Record<string, RecurrenceException>,
): RecurrenceException[] {
  return Object.values(exceptions).filter((exception) => !exception.deleted_at);
}

export function useDayAgenda(date: ISODate): readonly AgendaItem[] {
  const calendarItems = useTable("calendar_items");
  const projectItems = useTable("project_items");
  const projectsById = useTable("projects");
  const exceptions = useTable("recurrence_exceptions");
  const manualDatesJson = useUserSettings()?.today_manual_dates ?? "[]";

  const manualToday = useMemo(() => {
    try {
      return new Set<string>(JSON.parse(manualDatesJson));
    } catch {
      return new Set<string>();
    }
  }, [manualDatesJson]);

  return useMemo(() => {
    const exList = activeExceptions(exceptions);
    const fromCalendar = Object.values(calendarItems).flatMap((item) =>
      expandForDate(item, date, exList),
    );
    const fromProjects = Object.values(projectItems).flatMap((item) => {
      if (item.deleted_at || item.scheduled_date !== date) return [];
      const project = projectsById[item.project_id];
      if (!project || project.deleted_at) return [];
      return [projectItemAgendaItem(item, project)];
    });

    const merged = [...fromCalendar, ...fromProjects];
    const unique = new Map<string, AgendaItem>();
    for (const item of merged) {
      if (!item.deletedAt && !unique.has(item.occurrenceId)) unique.set(item.occurrenceId, item);
    }
    const list = [...unique.values()];
    return manualToday.has(date) ? list.sort(compareManual) : list.sort(compareAgendaItems);
  }, [calendarItems, projectItems, projectsById, exceptions, date, manualToday]);
}

/** Every agenda entry between two dates (inclusive) — for the Calendar views. */
export function useRangeAgenda(start: ISODate, end: ISODate): readonly AgendaItem[] {
  const calendarItems = useTable("calendar_items");
  const projectItems = useTable("project_items");
  const projectsById = useTable("projects");
  const exceptions = useTable("recurrence_exceptions");

  return useMemo(() => {
    const dates = eachDate(start, end);
    const exList = activeExceptions(exceptions);
    const inRange = (date: string) => date >= start && date <= end;

    const fromCalendar = Object.values(calendarItems).flatMap((item) =>
      dates.flatMap((date) => expandForDate(item, date, exList)),
    );
    const fromProjects = Object.values(projectItems).flatMap((item) => {
      if (item.deleted_at || !item.scheduled_date || !inRange(item.scheduled_date)) return [];
      const project = projectsById[item.project_id];
      if (!project || project.deleted_at) return [];
      return [projectItemAgendaItem(item, project)];
    });

    const unique = new Map<string, AgendaItem>();
    for (const item of [...fromCalendar, ...fromProjects]) {
      if (!item.deletedAt && !unique.has(item.occurrenceId)) unique.set(item.occurrenceId, item);
    }
    return [...unique.values()].sort(compareAgendaItems);
  }, [calendarItems, projectItems, projectsById, exceptions, start, end]);
}
