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
const { calendarItems, routine, remember, settings, timeLogs } = await import("./repositories.ts");
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

test("soft delete then restore keeps the row; purge tombstones it and leaves it deleted", () => {
  const item = calendarItems.create({ item_type: "task", title: "Temp", date: "2026-09-04" });

  calendarItems.softDelete(item.id);
  assert.ok(getDatabase().calendar_items[item.id].deleted_at);

  calendarItems.restore(item.id);
  assert.equal(getDatabase().calendar_items[item.id].deleted_at, null);

  calendarItems.purge(item.id);
  // The row stays, soft-deleted, so the deletion syncs like any other change.
  assert.ok(getDatabase().calendar_items[item.id].deleted_at);
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

test("routine reset only clears checked items and keeps the list", () => {
  const list = routine.ensureDefaultList();
  const a = routine.addItem(list.id, "Water");
  const b = routine.addItem(list.id, "Stretch");
  routine.setChecked(a.id, true);
  routine.setChecked(b.id, true);

  routine.resetList(list.id);
  assert.equal(getDatabase().routine_items[a.id].completed_at, null);
  assert.equal(getDatabase().routine_items[b.id].completed_at, null);
  assert.equal(getDatabase().routine_items[a.id].deleted_at, null);
});

test("a blank remember item is created and can be filled in later", () => {
  const row = remember.create("2026-09-04", "");
  assert.equal(getDatabase().remember_items[row.id].title, "");
  remember.update(row.id, { title: "Call the bank" });
  assert.equal(getDatabase().remember_items[row.id].title, "Call the bank");
});

test("marking the overdue review stores today's date in settings", () => {
  settings.markOverdueReviewed("2026-09-04");
  assert.equal(getDatabase().user_settings?.last_overdue_review_date, "2026-09-04");
});

test("setDayManualOrder toggles a date in and out of the manual set", () => {
  settings.setDayManualOrder("2026-09-04", true);
  assert.deepEqual(JSON.parse(getDatabase().user_settings?.today_manual_dates ?? "[]"), ["2026-09-04"]);
  settings.setDayManualOrder("2026-09-05", true);
  assert.equal(
    JSON.parse(getDatabase().user_settings?.today_manual_dates ?? "[]").length,
    2,
  );
  settings.setDayManualOrder("2026-09-04", false);
  assert.deepEqual(JSON.parse(getDatabase().user_settings?.today_manual_dates ?? "[]"), ["2026-09-05"]);
});

test("routine.applyOrder rewrites items into the given order", () => {
  const list = routine.ensureDefaultList();
  const a = routine.addItem(list.id, "a");
  const b = routine.addItem(list.id, "b");
  const c = routine.addItem(list.id, "c");
  routine.applyOrder([c.id, a.id, b.id]);
  const key = (id: string) => getDatabase().routine_items[id].manual_sort_key;
  assert.ok(key(c.id) < key(a.id) && key(a.id) < key(b.id));
});

test("remember.applyOrder rewrites items into the given order", () => {
  const a = remember.create("2026-09-04", "a");
  const b = remember.create("2026-09-04", "b");
  const c = remember.create("2026-09-04", "c");
  remember.applyOrder([c.id, a.id, b.id]);
  const key = (id: string) => getDatabase().remember_items[id].manual_sort_key;
  assert.ok(key(c.id) < key(a.id) && key(a.id) < key(b.id));
});

test("saving the same day twice keeps one row with the latest values", () => {
  timeLogs.save("2026-10-09", { university_minutes: 30, extras_minutes: 0 });
  timeLogs.save("2026-10-09", { university_minutes: 150 });
  const rows = Object.values(getDatabase().time_logs).filter((row) => row.date === "2026-10-09");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].university_minutes, 150);
  assert.equal(rows[0].extras_minutes, 0, "the other area is untouched");
});
