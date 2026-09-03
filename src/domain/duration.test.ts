import assert from "node:assert/strict";
import { test } from "node:test";

import { formatDuration, parseDuration, totalEstimatedMinutes } from "./duration.ts";
import type { ProjectItem } from "./entities.ts";

test("parseDuration accepts every documented shorthand", () => {
  assert.equal(parseDuration("90"), 90);
  assert.equal(parseDuration("90min"), 90);
  assert.equal(parseDuration("90 min"), 90);
  assert.equal(parseDuration("1h30"), 90);
  assert.equal(parseDuration("1h 30"), 90);
  assert.equal(parseDuration("1h"), 60);
  assert.equal(parseDuration("1:30"), 90);
  assert.equal(parseDuration("0"), 0);
});

test("parseDuration returns null for empty input and throws on nonsense", () => {
  assert.equal(parseDuration("   "), null);
  assert.throws(() => parseDuration("1:60"));
  assert.throws(() => parseDuration("1h75"));
  assert.throws(() => parseDuration("banana"));
  assert.throws(() => parseDuration("-5"));
});

test("formatDuration renders hours and minutes", () => {
  assert.equal(formatDuration(null), "");
  assert.equal(formatDuration(45), "45 min");
  assert.equal(formatDuration(60), "1 h");
  assert.equal(formatDuration(90), "1 h 30 min");
});

test("totalEstimatedMinutes ignores items without an estimate", () => {
  const items = [
    { estimated_minutes: 30 },
    { estimated_minutes: null },
    { estimated_minutes: 15 },
  ] as ProjectItem[];
  assert.equal(totalEstimatedMinutes(items), 45);
});
