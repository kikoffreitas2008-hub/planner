import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createClientId,
  formatTimeLabel,
  formatTimeRange,
  isISODateOnly,
  startOfWeekISO,
} from "./date.ts";

test("isISODateOnly accepts real calendar dates and rejects the rest", () => {
  assert.equal(isISODateOnly("2026-09-04"), true);
  assert.equal(isISODateOnly("2026-02-29"), false); // 2026 is not a leap year
  assert.equal(isISODateOnly("2026-13-01"), false);
  assert.equal(isISODateOnly("2026-9-4"), false);
  assert.equal(isISODateOnly("not a date"), false);
});

test("startOfWeekISO returns the Monday of that week", () => {
  assert.equal(startOfWeekISO("2026-09-04"), "2026-08-31"); // Friday -> Monday
  assert.equal(startOfWeekISO("2026-08-31"), "2026-08-31"); // Monday -> itself
  assert.equal(startOfWeekISO("2026-09-06"), "2026-08-31"); // Sunday -> that Monday
});

test("createClientId produces a v4-shaped UUID", () => {
  const id = createClientId();
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.notEqual(createClientId(), createClientId());
});

test("time formatting uses 24-hour Lisbon wall clock", () => {
  const winter = "2026-01-15T09:30:00.000Z"; // Lisbon = UTC in winter
  assert.equal(formatTimeLabel(winter, "Europe/Lisbon"), "09:30");
  const summer = "2026-07-15T09:30:00.000Z"; // Lisbon = UTC+1 in summer
  assert.equal(formatTimeLabel(summer, "Europe/Lisbon"), "10:30");
  assert.equal(
    formatTimeRange("2026-01-15T09:00:00.000Z", "2026-01-15T14:00:00.000Z", "Europe/Lisbon"),
    "09:00–14:00",
  );
});
