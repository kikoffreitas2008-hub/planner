import assert from "node:assert/strict";
import { test } from "node:test";

import type { RememberItem } from "./entities.ts";
import { visibleRememberItems } from "./remember.ts";

function item(overrides: Partial<RememberItem> & { id: string }): RememberItem {
  return {
    user_id: "u1",
    created_at: "2026-09-01T09:00:00.000Z",
    updated_at: "2026-09-01T09:00:00.000Z",
    deleted_at: null,
    date: "2026-09-01",
    title: overrides.id,
    color: "yellow",
    manual_sort_key: "a0",
    ...overrides,
  };
}

test("a reminder shows on every day until it is deleted, whatever its stored date", () => {
  const rows = {
    old: item({ id: "old", date: "2026-01-05", manual_sort_key: "a0" }),
    today: item({ id: "today", date: "2026-09-21", manual_sort_key: "a1" }),
    future: item({ id: "future", date: "2027-03-01", manual_sort_key: "a2" }),
  };
  assert.deepEqual(
    visibleRememberItems(rows).map((entry) => entry.id),
    ["old", "today", "future"],
  );
});

test("deleted reminders are hidden", () => {
  const rows = {
    kept: item({ id: "kept", manual_sort_key: "a0" }),
    gone: item({ id: "gone", manual_sort_key: "a1", deleted_at: "2026-09-02T09:00:00.000Z" }),
  };
  assert.deepEqual(
    visibleRememberItems(rows).map((entry) => entry.id),
    ["kept"],
  );
});

test("reminders follow manual order, with ties broken by creation time then id", () => {
  const rows = {
    c: item({ id: "c", manual_sort_key: "a1" }),
    b: item({ id: "b", manual_sort_key: "a0", created_at: "2026-09-03T09:00:00.000Z" }),
    a: item({ id: "a", manual_sort_key: "a0", created_at: "2026-09-02T09:00:00.000Z" }),
    z: item({ id: "z", manual_sort_key: "a0", created_at: "2026-09-02T09:00:00.000Z" }),
  };
  assert.deepEqual(
    visibleRememberItems(rows).map((entry) => entry.id),
    ["a", "z", "b", "c"],
  );
});
