import assert from "node:assert/strict";
import { test } from "node:test";

import type { RecurrenceException } from "./entities.ts";
import {
  occurrencesForDate,
  splitRecurringSeries,
  type RecurrenceRule,
  type RecurringSource,
} from "./recurrence.ts";

function source(overrides: Partial<RecurringSource>): RecurringSource {
  return {
    allDay: false,
    color: "blue",
    completedAt: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    date: "2026-09-01",
    endsAt: "2026-09-01T10:00:00.000Z",
    id: "series",
    itemKind: "task",
    notes: null,
    startsAt: "2026-09-01T09:00:00.000Z",
    title: "Recurring",
    userId: "u",
    ...overrides,
  };
}

const NO_EXCEPTIONS: readonly RecurrenceException[] = [];

function occurs(rule: RecurrenceRule, date: string, overrides: Partial<RecurringSource> = {}): boolean {
  return occurrencesForDate(source({ recurrenceRule: rule, ...overrides }), date, NO_EXCEPTIONS).length > 0;
}

test("daily with an interval only lands on matching days", () => {
  const rule: RecurrenceRule = { frequency: "daily", interval: 2, end: { kind: "never" } };
  assert.equal(occurs(rule, "2026-09-01"), true);
  assert.equal(occurs(rule, "2026-09-02"), false);
  assert.equal(occurs(rule, "2026-09-03"), true);
});

test("weekdays skips weekends", () => {
  const rule: RecurrenceRule = { frequency: "weekdays", interval: 1, end: { kind: "never" } };
  assert.equal(occurs(rule, "2026-09-04"), true); // Friday
  assert.equal(occurs(rule, "2026-09-05"), false); // Saturday
  assert.equal(occurs(rule, "2026-09-07"), true); // Monday
});

test("weekly honours the listed weekdays", () => {
  const rule: RecurrenceRule = {
    frequency: "weekly",
    interval: 1,
    weekdays: [1, 3],
    end: { kind: "never" },
  };
  assert.equal(occurs(rule, "2026-09-07"), true); // Monday
  assert.equal(occurs(rule, "2026-09-09"), true); // Wednesday
  assert.equal(occurs(rule, "2026-09-08"), false); // Tuesday
});

test("monthly clamps to the last day of shorter months", () => {
  const rule: RecurrenceRule = { frequency: "monthly", interval: 1, end: { kind: "never" } };
  assert.equal(occurs(rule, "2026-02-28", { date: "2026-01-31" }), true);
  assert.equal(occurs(rule, "2026-03-31", { date: "2026-01-31" }), true);
});

test("end conditions stop the series", () => {
  assert.equal(
    occurs({ frequency: "daily", interval: 1, end: { kind: "count", count: 3 } }, "2026-09-04"),
    false,
  );
  assert.equal(
    occurs({ frequency: "daily", interval: 1, end: { kind: "count", count: 3 } }, "2026-09-03"),
    true,
  );
  assert.equal(
    occurs({ frequency: "daily", interval: 1, end: { kind: "date", date: "2026-09-02" } }, "2026-09-03"),
    false,
  );
});

test("a cancelled exception removes just that occurrence", () => {
  const rule: RecurrenceRule = { frequency: "daily", interval: 1, end: { kind: "never" } };
  const exception = {
    id: "x",
    user_id: "u",
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    deleted_at: null,
    origin_id: "series",
    occurrence_date: "2026-09-03",
    exception_type: "cancelled",
    replacement_json: null,
  } as RecurrenceException;
  assert.equal(
    occurrencesForDate(source({ recurrenceRule: rule }), "2026-09-03", [exception]).length,
    0,
  );
  assert.equal(
    occurrencesForDate(source({ recurrenceRule: rule }), "2026-09-04", [exception]).length,
    1,
  );
});

test("a modified exception overrides fields for that day only", () => {
  const rule: RecurrenceRule = { frequency: "daily", interval: 1, end: { kind: "never" } };
  const exception = {
    id: "x",
    user_id: "u",
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    deleted_at: null,
    origin_id: "series",
    occurrence_date: "2026-09-03",
    exception_type: "modified",
    replacement_json: JSON.stringify({ title: "Special day" }),
  } as RecurrenceException;
  const [occurrence] = occurrencesForDate(source({ recurrenceRule: rule }), "2026-09-03", [exception]);
  assert.equal(occurrence.title, "Special day");
});

test("splitRecurringSeries shortens the original and starts a fresh series", () => {
  const rule: RecurrenceRule = { frequency: "daily", interval: 1, end: { kind: "never" } };
  const { previous, following } = splitRecurringSeries(
    source({ recurrenceRule: rule }) as RecurringSource & { recurrenceRule: RecurrenceRule },
    "2026-09-10",
    { title: "From here on" },
  );
  assert.deepEqual(previous.recurrenceRule.end, { kind: "date", date: "2026-09-09" });
  assert.equal(following.date, "2026-09-10");
  assert.equal(following.title, "From here on");
  assert.notEqual(following.id, "series");
});
