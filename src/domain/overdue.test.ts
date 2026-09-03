import assert from "node:assert/strict";
import { test } from "node:test";

import type { AgendaItem } from "./agenda.ts";
import { nextLocalDate, overdueCandidates, validateOverdueReschedule } from "./overdue.ts";

function agendaItem(overrides: Partial<AgendaItem>): AgendaItem {
  return {
    allDay: false,
    color: "blue",
    completedAt: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    date: "2026-09-01",
    deletedAt: null,
    endsAt: "2026-09-01T10:00:00.000Z",
    itemKind: "task",
    notes: null,
    occurrenceId: "a",
    origin: { kind: "calendar", id: "a" },
    recurrenceRule: null,
    startsAt: "2026-09-01T09:00:00.000Z",
    title: "Old task",
    ...overrides,
  };
}

test("nextLocalDate advances one calendar day", () => {
  assert.equal(nextLocalDate("2026-09-04"), "2026-09-05");
  assert.equal(nextLocalDate("2026-12-31"), "2027-01-01");
});

test("overdueCandidates returns unfinished items from before today", () => {
  const items = [
    agendaItem({ occurrenceId: "past", date: "2026-09-01" }),
    agendaItem({ occurrenceId: "done", date: "2026-09-01", completedAt: "2026-09-01T11:00:00.000Z" }),
    agendaItem({ occurrenceId: "deleted", date: "2026-09-01", deletedAt: "2026-09-01T11:00:00.000Z" }),
    agendaItem({ occurrenceId: "today", date: "2026-09-04" }),
  ];
  const result = overdueCandidates(items, "2026-09-04", null);
  assert.deepEqual(
    result.map((item) => item.occurrenceId),
    ["past"],
  );
});

test("the review is skipped when it already ran today", () => {
  const items = [agendaItem({ date: "2026-09-01" })];
  assert.deepEqual(overdueCandidates(items, "2026-09-04", "2026-09-04"), []);
});

test("rescheduling requires a genuinely new date and both times", () => {
  const item = agendaItem({ date: "2026-09-01" });
  assert.equal(
    validateOverdueReschedule(item, { date: "2026-09-01", start: "09:00", end: "10:00" }).valid,
    false,
  );
  assert.equal(
    validateOverdueReschedule(item, { date: "2026-09-05", start: "", end: "10:00" }).valid,
    false,
  );
  const ok = validateOverdueReschedule(item, { date: "2026-09-05", start: "09:00", end: "10:00" });
  assert.equal(ok.valid, true);
  if (ok.valid) {
    assert.equal(ok.date, "2026-09-05");
    // 5 Sep 2026 is inside Lisbon DST, so 09:00 wall clock is 08:00 UTC.
    assert.equal(ok.startsAt, "2026-09-05T08:00:00.000Z");
  }
});
