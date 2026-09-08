import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CALENDAR_VIEWS,
  calendarViewLabel,
  monthGrid,
  moveCalendarAnchor,
  selectCalendarDate,
  weekRange,
  weekdayLabels,
  type CalendarDateState,
} from "./calendarGrid.ts";

test("the month grid starts on Monday and covers whole weeks", () => {
  const grid = monthGrid("2026-09-15");
  assert.equal(grid.length % 7, 0);
  assert.ok(grid.length === 35 || grid.length === 42);
  assert.equal(grid[0].date, "2026-08-31"); // Monday before 1 Sep
  assert.equal(grid[0].weekdayIndex, 0);
  const first = grid.find((cell) => cell.date === "2026-09-01");
  assert.equal(first?.inVisibleMonth, true);
  assert.equal(grid[0].inVisibleMonth, false);
});

test("weekRange returns the seven days from Monday", () => {
  const week = weekRange("2026-09-04");
  assert.deepEqual(week, [
    "2026-08-31",
    "2026-09-01",
    "2026-09-02",
    "2026-09-03",
    "2026-09-04",
    "2026-09-05",
    "2026-09-06",
  ]);
});

test("moving the month anchor clamps onto shorter months", () => {
  const state: CalendarDateState = {
    selectedDate: "2026-01-31",
    view: "month",
    visibleAnchor: "2026-01-31",
  };
  assert.equal(moveCalendarAnchor(state, 1).visibleAnchor, "2026-02-28");
});

test("selecting a date moves the visible anchor with it", () => {
  const state: CalendarDateState = {
    selectedDate: "2026-09-01",
    view: "day",
    visibleAnchor: "2026-09-01",
  };
  const next = selectCalendarDate(state, "2026-09-20");
  assert.equal(next.selectedDate, "2026-09-20");
  assert.equal(next.visibleAnchor, "2026-09-20");
});

test("there are seven weekday labels beginning with Monday", () => {
  const labels = weekdayLabels();
  assert.equal(labels.length, 7);
  assert.equal(labels[0].compact, "Mon");
  assert.equal(labels[6].compact, "Sun");
});

test("calendar views are ordered coarse to fine with capitalized labels", () => {
  assert.deepEqual([...CALENDAR_VIEWS], ["month", "week", "day"]);
  assert.deepEqual(CALENDAR_VIEWS.map(calendarViewLabel), ["Month", "Week", "Day"]);
});
