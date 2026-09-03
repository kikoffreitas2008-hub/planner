import assert from "node:assert/strict";
import { test } from "node:test";

import { validateTimeRange } from "./timeRange.ts";

test("a normal daytime range converts wall-clock Lisbon time to UTC", () => {
  const result = validateTimeRange({
    date: "2026-01-15",
    start: "09:00",
    end: "14:00",
    crossesMidnight: false,
  });
  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.startsAt, "2026-01-15T09:00:00.000Z"); // winter: Lisbon == UTC
    assert.equal(result.endsAt, "2026-01-15T14:00:00.000Z");
  }
});

test("summer times account for Lisbon DST (UTC+1)", () => {
  const result = validateTimeRange({
    date: "2026-07-15",
    start: "09:00",
    end: "10:30",
    crossesMidnight: false,
  });
  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.startsAt, "2026-07-15T08:00:00.000Z");
    assert.equal(result.endsAt, "2026-07-15T09:30:00.000Z");
  }
});

test("malformed times are rejected", () => {
  const result = validateTimeRange({ date: "2026-01-15", start: "9:00", end: "25:00", crossesMidnight: false });
  assert.equal(result.valid, false);
});

test("end before start needs explicit cross-midnight confirmation", () => {
  const first = validateTimeRange({
    date: "2026-01-15",
    start: "23:00",
    end: "01:00",
    crossesMidnight: false,
  });
  assert.equal(first.valid, false);
  if (!first.valid) assert.equal(first.requiresCrossMidnightConfirmation, true);

  const confirmed = validateTimeRange({
    date: "2026-01-15",
    start: "23:00",
    end: "01:00",
    crossesMidnight: true,
  });
  assert.equal(confirmed.valid, true);
  if (confirmed.valid) {
    assert.equal(confirmed.startsAt, "2026-01-15T23:00:00.000Z");
    assert.equal(confirmed.endsAt, "2026-01-16T01:00:00.000Z");
  }
});

test("the spring-forward night still yields a valid instant", () => {
  // Lisbon skips 01:00->02:00 on 2026-03-29.
  const result = validateTimeRange({
    date: "2026-03-29",
    start: "00:30",
    end: "03:30",
    crossesMidnight: false,
  });
  assert.equal(result.valid, true);
  if (result.valid) {
    assert.equal(result.startsAt, "2026-03-29T00:30:00.000Z");
    assert.equal(result.endsAt, "2026-03-29T02:30:00.000Z");
  }
});
