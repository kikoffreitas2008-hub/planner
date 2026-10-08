import assert from "node:assert/strict";
import { test } from "node:test";

import type { ISODate } from "./date.ts";
import {
  balanceFor,
  formatBalance,
  latestByDate,
  targetFor,
  unansweredDays,
  type TimeLogLike,
} from "./timeTracker.ts";

function log(date: string, university: number, extras: number, updatedAt = "2026-10-10T00:00:00.000Z"): TimeLogLike {
  return {
    date: date as ISODate,
    university_minutes: university,
    extras_minutes: extras,
    updated_at: updatedAt,
    deleted_at: null,
  };
}

test("targets follow the weekday", () => {
  // 2026-10-12 is a Monday, 2026-10-15 a Thursday, 2026-10-09 a Friday, 2026-10-11 a Sunday.
  assert.equal(targetFor("2026-10-12", "university"), 60);
  assert.equal(targetFor("2026-10-12", "extras"), 90);
  assert.equal(targetFor("2026-10-15", "extras"), 90);
  assert.equal(targetFor("2026-10-09", "university"), 120);
  assert.equal(targetFor("2026-10-09", "extras"), 0);
  assert.equal(targetFor("2026-10-11", "university"), 120);
});

test("balance sums given minus target over logged days", () => {
  const logs = [log("2026-10-09", 90, 30), log("2026-10-12", 60, 120)];
  assert.equal(balanceFor(logs, "university"), (90 - 120) + (60 - 60));
  assert.equal(balanceFor(logs, "extras"), (30 - 0) + (120 - 90));
});

test("the same day logged twice counts once, latest wins", () => {
  const logs = [
    log("2026-10-09", 30, 0, "2026-10-10T01:00:00.000Z"),
    log("2026-10-09", 150, 0, "2026-10-10T02:00:00.000Z"),
  ];
  assert.equal(latestByDate(logs).length, 1);
  assert.equal(balanceFor(logs, "university"), 150 - 120);
});

test("deleted rows and days before the start never count", () => {
  const deleted = { ...log("2026-10-12", 600, 0), deleted_at: "2026-10-13T00:00:00.000Z" };
  const logs = [log("2026-10-08", 600, 600), deleted];
  assert.equal(balanceFor(logs, "university"), 0);
});

test("unanswered days run from the start to yesterday, skipping logged ones", () => {
  const logs = [log("2026-10-10", 0, 0)];
  assert.deepEqual(unansweredDays(logs, "2026-10-13"), ["2026-10-09", "2026-10-11", "2026-10-12"]);
});

test("nothing is asked on or before the start date", () => {
  assert.deepEqual(unansweredDays([], "2026-10-08"), []);
  assert.deepEqual(unansweredDays([], "2026-10-09"), []);
  assert.deepEqual(unansweredDays([], "2026-10-10"), ["2026-10-09"]);
});

test("balance text and tone", () => {
  assert.deepEqual(formatBalance(-90), { text: "−1 h 30 min", tone: "owed" });
  assert.deepEqual(formatBalance(45), { text: "+45 min", tone: "ahead" });
  assert.deepEqual(formatBalance(0), { text: "Even", tone: "even" });
});
