import assert from "node:assert/strict";
import { test } from "node:test";

import type { CalendarItem } from "./entities.ts";
import { planRecurrenceMutation } from "./recurrenceMutation.ts";

function series(): CalendarItem {
  return {
    id: "series",
    user_id: "u",
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
    deleted_at: null,
    item_type: "event",
    location: null,
    title: "Standup",
    notes: null,
    date: "2026-09-01",
    starts_at: "2026-09-01T09:00:00.000Z",
    ends_at: "2026-09-01T09:15:00.000Z",
    all_day: false,
    completed_at: null,
    color: "blue",
    recurrence_rule: JSON.stringify({ frequency: "daily", interval: 1, end: { kind: "never" } }),
    notification_offsets: null,
    series_started_at: "2026-09-01T09:00:00.000Z",
    manual_sort_key: "a0",
  };
}

test("editing one occurrence writes a single exception", () => {
  const commands = planRecurrenceMutation(series(), "2026-09-10", "one", {
    kind: "update",
    changes: { title: "Standup (moved)" },
  });
  assert.equal(commands.length, 1);
  assert.equal(commands[0].kind, "upsert_exception");
});

test("editing the whole series updates the source row", () => {
  const commands = planRecurrenceMutation(series(), "2026-09-10", "all", {
    kind: "update",
    changes: { color: "green" },
  });
  assert.deepEqual(commands, [
    { kind: "update_source", sourceId: "series", changes: { color: "green" } },
  ]);
});

test("editing this-and-following shortens the source and inserts a new series", () => {
  const commands = planRecurrenceMutation(series(), "2026-09-10", "future", {
    kind: "update",
    changes: { title: "New name" },
    newSeriesId: "series-2",
  });
  const kinds = commands.map((command) => command.kind);
  assert.deepEqual(kinds, ["update_source", "insert_source", "migrate_exceptions"]);
  const insert = commands.find((command) => command.kind === "insert_source");
  assert.ok(insert && insert.kind === "insert_source");
  if (insert && insert.kind === "insert_source") {
    assert.equal(insert.source.id, "series-2");
    assert.equal(insert.source.date, "2026-09-10");
    assert.equal(insert.source.title, "New name");
  }
});

test("deleting this-and-following only shortens the source", () => {
  const commands = planRecurrenceMutation(series(), "2026-09-10", "future", {
    kind: "delete",
  });
  assert.equal(commands.length, 1);
  assert.equal(commands[0].kind, "update_source");
});
