import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

// A minimal localStorage so persistence.ts has somewhere to write during tests.
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}
(globalThis as { window?: unknown }).window = { localStorage: new MemoryStorage() };

const { loadDatabase, saveDatabase, clearDatabase } = await import("./persistence.ts");
const { getDatabase, resetDatabaseForTests, replaceDatabase } = await import("./store.ts");
const { calendarItems } = await import("./repositories.ts");
const { createEmptyDatabase } = await import("./db.ts");

beforeEach(() => {
  clearDatabase();
  resetDatabaseForTests();
});

test("creating an item puts it in the store with the local owner and a sort key", () => {
  const item = calendarItems.create({
    item_type: "task",
    title: "Buy milk",
    date: "2026-09-04",
  });
  const stored = getDatabase().calendar_items[item.id];
  assert.ok(stored, "row is in the store");
  assert.equal(stored.title, "Buy milk");
  assert.equal(stored.user_id, getDatabase().meta.localUserId);
  assert.ok(stored.manual_sort_key.length > 0);
  assert.equal(stored.deleted_at, null);
});

test("the database survives a serialize / reload round-trip", () => {
  const item = calendarItems.create({
    item_type: "event",
    title: "Dentist",
    date: "2026-09-10",
    starts_at: "2026-09-10T08:00:00.000Z",
    ends_at: "2026-09-10T08:30:00.000Z",
  });
  saveDatabase(getDatabase());

  // Wipe memory as if the app had been closed, then reload from storage.
  replaceDatabase(createEmptyDatabase());
  assert.equal(Object.keys(getDatabase().calendar_items).length, 0);

  const reloaded = loadDatabase();
  assert.ok(reloaded);
  replaceDatabase(reloaded);
  assert.equal(getDatabase().calendar_items[item.id]?.title, "Dentist");
});

test("soft delete then restore keeps the row; purge removes it and leaves a tombstone", () => {
  const item = calendarItems.create({ item_type: "task", title: "Temp", date: "2026-09-04" });

  calendarItems.softDelete(item.id);
  assert.ok(getDatabase().calendar_items[item.id].deleted_at);

  calendarItems.restore(item.id);
  assert.equal(getDatabase().calendar_items[item.id].deleted_at, null);

  calendarItems.purge(item.id);
  assert.equal(getDatabase().calendar_items[item.id], undefined);
  const tombstones = Object.values(getDatabase().sync_tombstones);
  assert.equal(tombstones.length, 1);
  assert.equal(tombstones[0].entity_id, item.id);
});

test("completing an item stamps completed_at and clearing it unsets it", () => {
  const item = calendarItems.create({ item_type: "task", title: "Task", date: "2026-09-04" });
  calendarItems.setCompleted(item.id, true);
  assert.ok(getDatabase().calendar_items[item.id].completed_at);
  calendarItems.setCompleted(item.id, false);
  assert.equal(getDatabase().calendar_items[item.id].completed_at, null);
});
