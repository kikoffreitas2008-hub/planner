import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}
(globalThis as { window?: unknown }).window = { localStorage: new MemoryStorage() };

import type { CalendarItem } from "../domain/entities.ts";

const { getDatabase, resetDatabaseForTests, upsertRow, localUserId } = await import("./store.ts");
const { mutateRecurringOccurrence } = await import("./recurrence.ts");
const { occurrencesForDate } = await import("../domain/recurrence.ts");

beforeEach(() => {
  resetDatabaseForTests();
});

function weeklyEvent(): CalendarItem {
  const now = "2026-09-01T00:00:00.000Z";
  const row: CalendarItem = {
    id: "series",
    user_id: localUserId(),
    created_at: now,
    updated_at: now,
    deleted_at: null,
    item_type: "event",
    location: null,
    title: "Standup",
    notes: null,
    date: "2026-09-07", // a Monday
    starts_at: "2026-09-07T08:00:00.000Z",
    ends_at: "2026-09-07T08:15:00.000Z",
    all_day: false,
    completed_at: null,
    color: "blue",
    recurrence_rule: JSON.stringify({ frequency: "weekly", interval: 1, end: { kind: "never" } }),
    notification_offsets: null,
    series_started_at: "2026-09-07T08:00:00.000Z",
    manual_sort_key: "a0",
  };
  upsertRow("calendar_items", row);
  return row;
}

function activeExceptions() {
  return Object.values(getDatabase().recurrence_exceptions).filter((e) => !e.deleted_at);
}

function occursOn(source: CalendarItem, date: string) {
  const rule = JSON.parse(source.recurrence_rule ?? "null");
  return occurrencesForDate(
    {
      allDay: source.all_day,
      color: source.color,
      completedAt: source.completed_at,
      createdAt: source.created_at,
      date: source.date,
      endsAt: source.ends_at,
      id: source.id,
      itemKind: source.item_type,
      location: source.location,
      notes: source.notes,
      recurrenceRule: rule,
      startsAt: source.starts_at,
      title: source.title,
      userId: source.user_id,
    },
    date,
    activeExceptions(),
  );
}

test("editing one occurrence writes a modified exception and leaves the rest", () => {
  const source = weeklyEvent();
  mutateRecurringOccurrence(source, "2026-09-14", "one", {
    kind: "update",
    changes: { title: "Standup (long)" },
  });

  assert.equal(activeExceptions().length, 1);
  const now = getDatabase().calendar_items.series;
  assert.equal(now.title, "Standup"); // series untouched

  assert.equal(occursOn(now, "2026-09-14")[0]?.title, "Standup (long)");
  assert.equal(occursOn(now, "2026-09-21")[0]?.title, "Standup");
});

test("deleting one occurrence cancels just that day", () => {
  const source = weeklyEvent();
  mutateRecurringOccurrence(source, "2026-09-14", "one", { kind: "delete" });
  const now = getDatabase().calendar_items.series;
  assert.equal(occursOn(now, "2026-09-14").length, 0);
  assert.equal(occursOn(now, "2026-09-21").length, 1);
});

test("editing the whole series updates the source", () => {
  const source = weeklyEvent();
  mutateRecurringOccurrence(source, "2026-09-14", "all", {
    kind: "update",
    changes: { title: "Sync" },
  });
  assert.equal(getDatabase().calendar_items.series.title, "Sync");
  assert.equal(activeExceptions().length, 0);
});

test("editing this-and-following shortens the source and starts a new series", () => {
  const source = weeklyEvent();
  mutateRecurringOccurrence(source, "2026-09-21", "future", {
    kind: "update",
    changes: { title: "New name" },
  });
  const original = getDatabase().calendar_items.series;
  const rule = JSON.parse(original.recurrence_rule ?? "null");
  assert.equal(rule.end.kind, "date");
  assert.equal(rule.end.date, "2026-09-20");

  const others = Object.values(getDatabase().calendar_items).filter((item) => item.id !== "series");
  assert.equal(others.length, 1);
  assert.equal(others[0].title, "New name");
  assert.equal(others[0].date, "2026-09-21");
});

test("completing one occurrence does not complete the series", () => {
  const source = weeklyEvent();
  mutateRecurringOccurrence(source, "2026-09-14", "one", {
    kind: "completion",
    completedAt: "2026-09-14T08:20:00.000Z",
  });
  assert.equal(getDatabase().calendar_items.series.completed_at, null);
  assert.ok(occursOn(getDatabase().calendar_items.series, "2026-09-14")[0]?.completedAt);
});

test("the domain expands a weekly rule across a whole month", () => {
  const source = weeklyEvent();
  const hits = ["2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28"].filter(
    (date) => occursOn(source, date).length > 0,
  );
  assert.equal(hits.length, 4);
  assert.equal(occursOn(source, "2026-09-08").length, 0);
});
