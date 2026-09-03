import assert from "node:assert/strict";
import { test } from "node:test";

import {
  TIMELINE_MINIMUM_HEIGHT,
  layoutTimeline,
  type TimelineInterval,
} from "./timelineLayout.ts";

function interval(id: string, start: string, end: string): TimelineInterval {
  return { id, allDay: false, startsAt: start, endsAt: end };
}

test("non-overlapping items each take the full width", () => {
  const placements = layoutTimeline(
    [
      interval("a", "2026-09-04T09:00:00.000Z", "2026-09-04T10:00:00.000Z"),
      interval("b", "2026-09-04T11:00:00.000Z", "2026-09-04T12:00:00.000Z"),
    ],
    "2026-09-04",
  );
  assert.ok(placements.every((placement) => placement.columnCount === 1 && placement.column === 0));
});

test("overlapping items are split into side-by-side columns", () => {
  const placements = layoutTimeline(
    [
      interval("a", "2026-09-04T09:00:00.000Z", "2026-09-04T10:30:00.000Z"),
      interval("b", "2026-09-04T10:00:00.000Z", "2026-09-04T11:00:00.000Z"),
    ],
    "2026-09-04",
  );
  const byId = Object.fromEntries(placements.map((placement) => [placement.id, placement]));
  assert.equal(byId.a.columnCount, 2);
  assert.equal(byId.b.columnCount, 2);
  assert.notEqual(byId.a.column, byId.b.column);
});

test("all-day and zero-length intervals are excluded", () => {
  const placements = layoutTimeline(
    [
      { id: "allday", allDay: true, startsAt: null, endsAt: null },
      interval("empty", "2026-09-04T09:00:00.000Z", "2026-09-04T09:00:00.000Z"),
    ],
    "2026-09-04",
  );
  assert.equal(placements.length, 0);
});

test("a very short item still gets a minimum height", () => {
  const [placement] = layoutTimeline(
    [interval("a", "2026-09-04T09:00:00.000Z", "2026-09-04T09:05:00.000Z")],
    "2026-09-04",
  );
  assert.equal(placement.height, TIMELINE_MINIMUM_HEIGHT);
});
