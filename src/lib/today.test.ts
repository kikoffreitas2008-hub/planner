import assert from "node:assert/strict";
import { test } from "node:test";

import { msUntilNextLisbonMidnight, todayInLisbon } from "./today.ts";

const HOUR = 60 * 60 * 1000;

test("time to the next Lisbon midnight in summer time (UTC+1)", () => {
  // 21:30 UTC on 08/10 is 22:30 in Lisbon; midnight is 23:00 UTC.
  assert.equal(msUntilNextLisbonMidnight(new Date("2026-10-08T21:30:00.000Z")), 1.5 * HOUR);
});

test("time to the next Lisbon midnight in winter time (UTC+0)", () => {
  assert.equal(msUntilNextLisbonMidnight(new Date("2026-12-01T22:00:00.000Z")), 2 * HOUR);
});

test("the wait always lands on the next Lisbon day, across DST changes", () => {
  for (const iso of ["2026-10-24T12:00:00.000Z", "2026-03-28T12:00:00.000Z", "2026-10-08T23:00:00.000Z"]) {
    const now = new Date(iso);
    const at = new Date(now.getTime() + msUntilNextLisbonMidnight(now));
    assert.notEqual(todayInLisbon(at), todayInLisbon(now), iso);
    assert.equal(todayInLisbon(new Date(at.getTime() - 1)), todayInLisbon(now), iso);
  }
});
