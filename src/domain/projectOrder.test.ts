import assert from "node:assert/strict";
import { test } from "node:test";

import type { ProjectItem } from "./entities.ts";
import { manualSortKeyBetween, orderProjectItems } from "./projectOrder.ts";

function pItem(id: string, overrides: Partial<ProjectItem>): ProjectItem {
  return {
    id,
    user_id: "u",
    created_at: `2026-09-01T00:00:0${id}.000Z`,
    updated_at: "2026-09-01T00:00:00.000Z",
    deleted_at: null,
    project_id: "p",
    parent_id: null,
    title: id,
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

test("importance order is High, Medium, Low, then none; ties keep creation order", () => {
  const items = [
    pItem("1", { importance: "low" }),
    pItem("2", { importance: "high" }),
    pItem("3", { importance: null }),
    pItem("4", { importance: "medium" }),
    pItem("5", { importance: "high" }),
  ];
  assert.deepEqual(
    orderProjectItems(items, "importance_default").map((entry) => entry.id),
    ["2", "5", "4", "1", "3"],
  );
});

test("manual order overrides importance entirely", () => {
  const items = [
    pItem("high", { importance: "high", manual_sort_key: "a2" }),
    pItem("medium", { importance: "medium", manual_sort_key: "a1" }),
  ];
  assert.deepEqual(
    orderProjectItems(items, "manual").map((entry) => entry.id),
    ["medium", "high"],
  );
});

test("manualSortKeyBetween yields a key that sorts between its neighbours", () => {
  const between = manualSortKeyBetween("a0", "a1");
  assert.ok("a0" < between && between < "a1");
  const first = manualSortKeyBetween(null, null);
  const second = manualSortKeyBetween(first, null);
  assert.ok(first < second);
});
