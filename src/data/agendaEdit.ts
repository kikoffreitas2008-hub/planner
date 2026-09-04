import type { AgendaFormResult } from "@/components/agenda/AgendaFormModal";
import { calendarItems, projectItems } from "@/data/repositories";
import { mutateRecurringOccurrence } from "@/data/recurrence";
import { getDatabase } from "@/data/store";
import { offerUndo } from "@/data/undoBar";
import type { AgendaItem } from "@/domain/agenda";
import type { ISODate, ISODateTime } from "@/domain/date";
import type { CalendarItem } from "@/domain/entities";
import type { RecurrenceScope } from "@/domain/recurrenceMutation";
import { isoToMinutes, wallClockToISO } from "@/lib/wallclock";

export function createFromForm(result: AgendaFormResult): CalendarItem {
  return calendarItems.create({
    item_type: result.item_type,
    title: result.title,
    notes: result.notes,
    date: result.date,
    all_day: result.all_day,
    starts_at: result.starts_at,
    ends_at: result.ends_at,
    color: result.color,
    location: result.location,
    recurrence_rule: result.recurrence_rule,
    notification_offsets: result.notification_offsets,
  });
}

function changesFromForm(result: AgendaFormResult): Partial<CalendarItem> {
  return {
    title: result.title,
    notes: result.notes,
    date: result.date,
    all_day: result.all_day,
    starts_at: result.starts_at,
    ends_at: result.ends_at,
    color: result.color,
    location: result.location,
    recurrence_rule: result.recurrence_rule,
    notification_offsets: result.notification_offsets,
  } as Partial<CalendarItem>;
}

/** Apply a form edit, honouring the recurrence scope for a series. */
export function applyFormEdit(
  item: AgendaItem,
  result: AgendaFormResult,
  scope?: RecurrenceScope,
): void {
  if (item.origin.kind === "project") {
    projectItems.update(item.origin.id, {
      title: result.title,
      notes: result.notes,
      scheduled_date: result.date,
      scheduled_all_day: result.all_day,
      scheduled_starts_at: result.starts_at,
      scheduled_ends_at: result.ends_at,
    });
    return;
  }

  const source = getDatabase().calendar_items[item.origin.id];
  if (!source) return;

  if (source.recurrence_rule && scope && scope !== "all") {
    mutateRecurringOccurrence(source, item.date as ISODate, scope, {
      kind: "update",
      changes: changesFromForm(result),
    });
    return;
  }
  calendarItems.update(source.id, changesFromForm(result));
}

export function deleteAgendaItem(item: AgendaItem, scope?: RecurrenceScope): void {
  if (item.origin.kind === "project") {
    const id = item.origin.id;
    const snapshot = getDatabase().project_items[id];
    if (!snapshot) return;
    projectItems.unschedule(id);
    offerUndo(
      "Removed from calendar",
      () =>
        projectItems.schedule(id, {
          scheduled_date: snapshot.scheduled_date,
          scheduled_all_day: snapshot.scheduled_all_day,
          scheduled_starts_at: snapshot.scheduled_starts_at,
          scheduled_ends_at: snapshot.scheduled_ends_at,
        }),
      () => {},
    );
    return;
  }

  const source = getDatabase().calendar_items[item.origin.id];
  if (!source) return;

  if (source.recurrence_rule && scope) {
    mutateRecurringOccurrence(source, item.date as ISODate, scope, { kind: "delete" });
    return;
  }
  const id = source.id;
  calendarItems.softDelete(id);
  offerUndo("Item deleted", () => calendarItems.restore(id), () => calendarItems.purge(id));
}

function writeTiming(
  item: AgendaItem,
  date: ISODate,
  startsAt: ISODateTime,
  endsAt: ISODateTime,
): void {
  if (item.origin.kind === "project") {
    projectItems.update(item.origin.id, {
      scheduled_date: date,
      scheduled_starts_at: startsAt,
      scheduled_ends_at: endsAt,
    });
    return;
  }
  const source = getDatabase().calendar_items[item.origin.id];
  if (!source) return;
  const changes: Partial<CalendarItem> = { date, starts_at: startsAt, ends_at: endsAt };
  if (source.recurrence_rule) {
    mutateRecurringOccurrence(source, item.date as ISODate, "one", { kind: "update", changes });
  } else {
    calendarItems.update(source.id, changes);
  }
}

/** Drag-to-move on the timeline: put the item at `startMinutes` on `date`, keeping its length. */
export function moveAgendaItem(item: AgendaItem, date: ISODate, startMinutes: number): void {
  const durationMs =
    item.startsAt && item.endsAt
      ? new Date(item.endsAt).getTime() - new Date(item.startsAt).getTime()
      : 60 * 60_000;
  const snapped = Math.max(0, Math.min(24 * 60 - 15, Math.round(startMinutes / 15) * 15));
  const startsAt = wallClockToISO(date, snapped);
  const endsAt = new Date(new Date(startsAt).getTime() + durationMs).toISOString() as ISODateTime;
  writeTiming(item, date, startsAt, endsAt);
}

/** Edge-handle resize: keep the start, move the end to `endMinutes`. */
export function resizeAgendaItem(item: AgendaItem, endMinutes: number): void {
  if (!item.startsAt) return;
  const startMin = isoToMinutes(item.startsAt, item.date as ISODate);
  const snapped = Math.max(startMin + 15, Math.round(endMinutes / 15) * 15);
  const startsAt = item.startsAt as ISODateTime;
  const endsAt = wallClockToISO(item.date as ISODate, snapped);
  writeTiming(item, item.date as ISODate, startsAt, endsAt);
}

/** Toggle completion. For a series occurrence this is always "this one only". */
export function toggleAgendaComplete(item: AgendaItem): void {
  const done = !item.completedAt;
  if (item.origin.kind === "project") {
    projectItems.setCompleted(item.origin.id, done);
    return;
  }
  const source = getDatabase().calendar_items[item.origin.id];
  if (!source) return;
  if (source.recurrence_rule) {
    mutateRecurringOccurrence(source, item.date as ISODate, "one", {
      kind: "completion",
      completedAt: done ? new Date().toISOString() : null,
    });
    return;
  }
  calendarItems.setCompleted(source.id, done);
}
