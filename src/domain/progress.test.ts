import assert from "node:assert/strict";
import { test } from "node:test";

import type { ProjectItem } from "./entities.ts";
import { calculateProjectProgress, eligibleProgressItems } from "./progress.ts";

function pItem(overrides: Partial<ProjectItem>): ProjectItem {
  return {
    id: "i",
    user_id: "u",
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    deleted_at: null,
    project_id: "p",
    parent_id: null,
    title: "Item",
    importance: null,
    estimated_minutes: null,
    notes: null,
    completed_at: null,
    manual_sort_key: "a0",
    scheduled_date: null,
    scheduled_all_day: false,
    scheduled_starts_at: null,
    scheduled_ends_at: null,
    ...overrides,
  } as ProjectItem;
}

test("progress by count is completed over eligible", () => {
  const items = [
    pItem({ id: "1", completed_at: "2026-09-02T00:00:00.000Z" }),
    pItem({ id: "2" }),
    pItem({ id: "3", deleted_at: "2026-09-02T00:00:00.000Z" }),
  ];
  const result = calculateProjectProgress(items, "simple", "items");
  assert.deepEqual(
    { completed: result.completed, total: result.total },
    { completed: 1, total: 2 },
  );
  assert.equal(result.ratio, 0.5);
});

test("progress by time excludes items with no estimate and reports how many", () => {
  const items = [
    pItem({ id: "1", estimated_minutes: 60, completed_at: "2026-09-02T00:00:00.000Z" }),
    pItem({ id: "2", estimated_minutes: 30 }),
    pItem({ id: "3", estimated_minutes: null }),
  ];
  const result = calculateProjectProgress(items, "simple", "time");
  assert.equal(result.completed, 60);
  assert.equal(result.total, 90);
  assert.equal(result.omittedEstimateCount, 1);
});

test("in a structured project only leaf subtasks and childless tasks count", () => {
  const items = [
    pItem({ id: "parent" }),
    pItem({ id: "child-a", parent_id: "parent", completed_at: "2026-09-02T00:00:00.000Z" }),
    pItem({ id: "child-b", parent_id: "parent" }),
    pItem({ id: "lonely" }),
  ];
  const eligible = eligibleProgressItems(items, "structured").map((entry) => entry.id).sort();
  assert.deepEqual(eligible, ["child-a", "child-b", "lonely"]);
  assert.equal(calculateProjectProgress(items, "structured", "items").total, 3);
});
