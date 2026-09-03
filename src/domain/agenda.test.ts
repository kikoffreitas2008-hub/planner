import assert from "node:assert/strict";
import { test } from "node:test";

import { compareAgendaItems, prepareAgenda, type AgendaItem } from "./agenda.ts";

function item(overrides: Partial<AgendaItem> & Pick<AgendaItem, "occurrenceId">): AgendaItem {
  return {
    allDay: false,
    color: "blue",
    completedAt: null,
    createdAt: "2026-09-04T06:00:00.000Z",
    date: "2026-09-04",
    deletedAt: null,
    endsAt: "2026-09-04T10:00:00.000Z",
    itemKind: "task",
    notes: null,
    origin: { kind: "calendar", id: overrides.occurrenceId },
    recurrenceRule: null,
    startsAt: "2026-09-04T09:00:00.000Z",
    title: "Item",
    ...overrides,
  };
}

test("all-day items sort before timed items, timed items sort by start", () => {
  const allDay = item({ occurrenceId: "allday", allDay: true, startsAt: null, endsAt: null });
  const nine = item({ occurrenceId: "nine", startsAt: "2026-09-04T09:00:00.000Z" });
  const eight = item({ occurrenceId: "eight", startsAt: "2026-09-04T08:00:00.000Z" });
  const sorted = [nine, allDay, eight].sort(compareAgendaItems).map((entry) => entry.occurrenceId);
  assert.deepEqual(sorted, ["allday", "eight", "nine"]);
});

test("completed items fall to the end regardless of their time", () => {
  const early = item({
    occurrenceId: "early-done",
    startsAt: "2026-09-04T07:00:00.000Z",
    completedAt: "2026-09-04T07:30:00.000Z",
  });
  const late = item({ occurrenceId: "late-open", startsAt: "2026-09-04T20:00:00.000Z" });
  const sorted = [early, late].sort(compareAgendaItems).map((entry) => entry.occurrenceId);
  assert.deepEqual(sorted, ["late-open", "early-done"]);
});

test("prepareAgenda drops deleted rows and de-duplicates by occurrence", () => {
  const kept = item({ occurrenceId: "kept" });
  const dupe = item({ occurrenceId: "kept", title: "Duplicate" });
  const gone = item({ occurrenceId: "gone", deletedAt: "2026-09-04T09:00:00.000Z" });
  const result = prepareAgenda([kept, dupe, gone]);
  assert.deepEqual(
    result.map((entry) => entry.occurrenceId),
    ["kept"],
  );
  assert.equal(result[0].title, "Item");
});
