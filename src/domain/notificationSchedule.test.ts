import assert from "node:assert/strict";
import { test } from "node:test";

import type { AgendaItem } from "./agenda.ts";
import { desiredNotifications } from "./notificationSchedule.ts";

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
    notificationOffsets: [],
    origin: { kind: "calendar", id: overrides.occurrenceId },
    recurrenceRule: null,
    startsAt: "2026-09-04T09:00:00.000Z",
    title: "Item",
    ...overrides,
  };
}

test("each offset becomes one future trigger", () => {
  const result = desiredNotifications(
    [item({ occurrenceId: "a", notificationOffsets: [0, 10] })],
    "2026-09-04T08:00:00.000Z",
  );
  assert.deepEqual(
    result.map((notification) => notification.triggerAt),
    ["2026-09-04T08:50:00.000Z", "2026-09-04T09:00:00.000Z"],
  );
  assert.ok(result.every((notification) => notification.title === "Planner"));
});

test("triggers already in the past are dropped", () => {
  const result = desiredNotifications(
    [item({ occurrenceId: "a", notificationOffsets: [10] })],
    "2026-09-04T08:55:00.000Z",
  );
  assert.equal(result.length, 0);
});

test("completed items schedule nothing", () => {
  const result = desiredNotifications(
    [
      item({
        occurrenceId: "a",
        notificationOffsets: [10],
        completedAt: "2026-09-04T07:00:00.000Z",
      }),
    ],
    "2026-09-04T08:00:00.000Z",
  );
  assert.equal(result.length, 0);
});

test("duplicate offsets collapse to a single notification", () => {
  const result = desiredNotifications(
    [item({ occurrenceId: "a", notificationOffsets: [10, 10] })],
    "2026-09-04T08:00:00.000Z",
  );
  assert.equal(result.length, 1);
});
