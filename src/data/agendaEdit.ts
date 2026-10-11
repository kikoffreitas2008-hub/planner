import { generateKeyBetween } from "fractional-indexing";

import type { AgendaFormResult } from "@/components/agenda/AgendaFormModal";
import { calendarItems, projectItems, settings } from "@/data/repositories";
import { mutateRecurringOccurrence } from "@/data/recurrence";
import { getDatabase } from "@/data/store";
import { offerUndo } from "@/data/undoBar";
import type { AgendaItem } from "@/domain/agenda";
import type { ISODate, ISODateTime } from "@/domain/date";
import type { CalendarItem } from "@/domain/entities";
import type { RecurrenceScope } from "@/domain/recurrenceMutation";
import { changedWindow, redistributeTimes } from "@/domain/timeSwap";
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

function isTimed(item: AgendaItem): item is AgendaItem & { startsAt: ISODateTime; endsAt: ISODateTime } {
  return !item.allDay && item.startsAt !== null && item.endsAt !== null;
}

/**
 * Items were put in a new order (a drag in the to-do list, or one block
 * dropped on another): give the timed ones new times in that order — each
 * keeps its length, and the session they span keeps its start and end.
 * Untimed and all-day items are left alone. Offers Undo when anything moved;
 * `undoAlso` runs with it (the list drag puts the old order back).
 */
export function retimeAgendaItems(
  itemsInNewOrder: readonly AgendaItem[],
  undoAlso?: () => void,
): void {
  const timed = itemsInNewOrder.filter(isTimed);
  if (timed.length < 2) return;

  const byId = new Map(timed.map((item) => [item.occurrenceId, item]));
  const slots = timed.map((item) => ({
    id: item.occurrenceId,
    start: isoToMinutes(item.startsAt, item.date),
    end: isoToMinutes(item.endsAt, item.date),
  }));
  const before = new Map(slots.map((slot) => [slot.id, slot]));
  const moved = redistributeTimes(slots).filter((slot) => before.get(slot.id)?.start !== slot.start);
  if (moved.length === 0) return;

  const originals = moved.map((slot) => {
    const item = byId.get(slot.id)!;
    return { item, startsAt: item.startsAt, endsAt: item.endsAt };
  });
  for (const slot of moved) {
    const item = byId.get(slot.id)!;
    const shiftMs = (slot.start - before.get(slot.id)!.start) * 60_000;
    const startsAt = new Date(new Date(item.startsAt).getTime() + shiftMs).toISOString() as ISODateTime;
    const endsAt = new Date(new Date(item.endsAt).getTime() + shiftMs).toISOString() as ISODateTime;
    writeTiming(item, item.date, startsAt, endsAt);
  }
  offerUndo(
    "Times swapped",
    () => {
      for (const original of originals) {
        writeTiming(original.item, original.item.date, original.startsAt, original.endsAt);
      }
      undoAlso?.();
    },
    () => {},
  );
}

/**
 * A drag in a day's list (Today's to-do, the month view's day list): store
 * the new manual order, then let the timed items that changed places trade
 * times so the order and the clock agree.
 */
export function reorderDayAgenda(
  date: ISODate,
  items: readonly AgendaItem[],
  orderedOccurrenceIds: readonly string[],
): void {
  const byOcc = new Map(items.map((entry) => [entry.occurrenceId, entry]));
  const db = getDatabase();
  const wasManual = (db.user_settings?.today_manual_dates ?? "").includes(`"${date}"`);
  const oldKeys = items.map((entry) => ({
    origin: entry.origin,
    key:
      entry.origin.kind === "calendar"
        ? db.calendar_items[entry.origin.id]?.manual_sort_key
        : db.project_items[entry.origin.id]?.manual_sort_key,
  }));
  function restoreOrder() {
    for (const { origin, key } of oldKeys) {
      if (key === undefined) continue;
      if (origin.kind === "calendar") calendarItems.update(origin.id, { manual_sort_key: key });
      else projectItems.update(origin.id, { manual_sort_key: key });
    }
    settings.setDayManualOrder(date, wasManual);
  }

  let previous: string | null = null;
  for (const occurrenceId of orderedOccurrenceIds) {
    const entry = byOcc.get(occurrenceId);
    if (!entry) continue;
    const key = generateKeyBetween(previous, null);
    if (entry.origin.kind === "calendar") {
      calendarItems.update(entry.origin.id, { manual_sort_key: key });
    } else {
      projectItems.update(entry.origin.id, { manual_sort_key: key });
    }
    previous = key;
  }
  settings.setDayManualOrder(date, true);

  const moved = changedWindow(
    items.map((entry) => entry.occurrenceId),
    orderedOccurrenceIds,
  );
  retimeAgendaItems(
    moved.flatMap((occurrenceId) => byOcc.get(occurrenceId) ?? []),
    restoreOrder,
  );
}

/** Timeline drop of one block on another: swap the two, the smart way. */
export function swapAgendaTimes(dragged: AgendaItem, target: AgendaItem): void {
  if (!isTimed(dragged) || !isTimed(target)) return;
  const draggedFirst = dragged.startsAt <= target.startsAt;
  retimeAgendaItems(draggedFirst ? [target, dragged] : [dragged, target]);
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
