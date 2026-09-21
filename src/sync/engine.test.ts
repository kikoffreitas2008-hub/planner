import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import type { SyncRow } from "./types.ts";

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

const { getDatabase, resetDatabaseForTests } = await import("../data/store.ts");
const { calendarItems, projects } = await import("../data/repositories.ts");
const { createFakeBackend } = await import("./fakeBackend.ts");
const { startSync, stopSync, syncNow } = await import("./engine.ts");
const outbox = await import("./outbox.ts");
const cursors = await import("./cursors.ts");

function remoteRow(overrides: Partial<SyncRow> & { id: string; updated_at: string }): SyncRow {
  return {
    user_id: "u1",
    deleted_at: null,
    item_type: "task",
    title: "Remote item",
    notes: null,
    date: "2026-09-04",
    starts_at: null,
    ends_at: null,
    all_day: false,
    completed_at: null,
    color: "blue",
    recurrence_rule: null,
    notification_offsets: null,
    series_started_at: null,
    location: null,
    created_at: "2026-09-04T00:00:00.000Z",
    manual_sort_key: "a0",
    ...overrides,
  };
}

beforeEach(() => {
  stopSync();
  resetDatabaseForTests();
  outbox._reset();
  cursors._reset();
});

test("a local create is pushed to the backend", async () => {
  const { backend, server } = createFakeBackend("u1");
  await startSync(backend);

  const item = calendarItems.create({ item_type: "task", title: "Buy milk", date: "2026-09-04" });
  await syncNow();

  const pushed = server.get("calendar_items", item.id);
  assert.ok(pushed);
  assert.equal(pushed?.title, "Buy milk");
  assert.equal(outbox.size(), 0);
});

test("a change from another device is pulled and merged in", async () => {
  const { backend, server } = createFakeBackend("u1");
  await startSync(backend);

  server.put("calendar_items", remoteRow({ id: "from-b", updated_at: "2026-09-04T10:00:00.000Z", title: "From device B" }));
  await syncNow();

  assert.equal(getDatabase().calendar_items["from-b"]?.title, "From device B");
});

test("offline edits are kept and pushed on reconnect", async () => {
  const { backend, server } = createFakeBackend("u1");
  await startSync(backend);

  server.setOnline(false);
  const item = calendarItems.create({ item_type: "task", title: "Written offline", date: "2026-09-04" });
  await syncNow();
  assert.equal(server.get("calendar_items", item.id), undefined);
  assert.ok(outbox.size() >= 1);

  server.setOnline(true);
  await syncNow();
  assert.equal(server.get("calendar_items", item.id)?.title, "Written offline");
});

test("last-write-wins: a newer remote row replaces the local one", async () => {
  const { backend, server } = createFakeBackend("u1");
  await startSync(backend);

  const item = calendarItems.create({ item_type: "task", title: "Original", date: "2026-09-04" });
  await syncNow();

  server.put(
    "calendar_items",
    remoteRow({ id: item.id, updated_at: "2999-01-01T00:00:00.000Z", title: "Newer wins" }),
  );
  await syncNow();

  assert.equal(getDatabase().calendar_items[item.id].title, "Newer wins");
});

test("a remote change landing during a push is not dropped", async () => {
  const { backend, server } = createFakeBackend("u1");
  await startSync(backend);

  // The other device writes while this one is mid-push, then the realtime
  // listener fires. The engine used to queue that pull and then throw it away.
  let injected = false;
  server.onPush(() => {
    if (injected) return;
    injected = true;
    server.put(
      "calendar_items",
      remoteRow({ id: "late", updated_at: "2026-09-04T10:00:00.000Z", title: "Landed mid-push" }),
    );
  });

  calendarItems.create({ item_type: "task", title: "Local", date: "2026-09-04" });
  await syncNow();

  assert.equal(getDatabase().calendar_items["late"]?.title, "Landed mid-push");
});

test("a newer remote row wins even when Postgres formats the timestamp differently", async () => {
  const { backend, server } = createFakeBackend("u1");
  await startSync(backend);

  const item = calendarItems.create({ item_type: "task", title: "Original", date: "2026-09-04" });
  await syncNow();
  const local = getDatabase().calendar_items[item.id].updated_at;
  // Postgres returns `timestamptz` as `+00:00` with microseconds, which sorts
  // *before* the local `...Z` string even when it is a second newer.
  const newer = new Date(Date.parse(local) + 1000)
    .toISOString()
    .replace("Z", "456+00:00");

  server.put("calendar_items", remoteRow({ id: item.id, updated_at: newer, title: "Newer wins" }));
  await syncNow();

  assert.equal(getDatabase().calendar_items[item.id].title, "Newer wins");
});

test("a row created before startSync (the auth-session race) still reaches the backend", async () => {
  const { backend, server } = createFakeBackend("u1");

  // Reproduces production: the app is usable before `supabase.auth.getSession()`
  // resolves, so a row can be created — and written straight to the local
  // database — before `startSync` ever wires up the mutation handler that
  // feeds the outbox. It was never in `pending()`, so nothing about the
  // outbox looked wrong; the row just silently never left the device.
  const project = projects.create({
    title: "Created before sign-in resolved",
    mode: "simple",
    color: "blue",
    progress_mode: "items",
  });

  await startSync(backend);

  assert.equal(server.get("projects", project.id)?.title, "Created before sign-in resolved");
});

test("a pre-start row never overwrites a newer version already on the server", async () => {
  const { backend, server } = createFakeBackend("u1");

  const project = projects.create({
    title: "Old local title",
    mode: "simple",
    color: "blue",
    progress_mode: "items",
  });
  // Another device edited the same project after this device last wrote it.
  server.put("projects", {
    ...(getDatabase().projects[project.id] as unknown as SyncRow),
    title: "Newer title from the iPad",
    updated_at: new Date(Date.now() + 60_000).toISOString(),
  });

  await startSync(backend);

  assert.equal(server.get("projects", project.id)?.title, "Newer title from the iPad");
  assert.equal(getDatabase().projects[project.id].title, "Newer title from the iPad");
});

test("one table failing to pull does not block the others", async () => {
  const { backend, server } = createFakeBackend("u1");
  // "user_settings" pulls first in SYNC_TABLES — breaking it used to abort
  // the whole cycle and take every table after it (projects, calendar_items,
  // ...) down too.
  server.breakPull("user_settings");
  await startSync(backend);

  server.put(
    "projects",
    {
      user_id: "u1",
      deleted_at: null,
      updated_at: "2026-09-04T10:00:00.000Z",
      created_at: "2026-09-04T10:00:00.000Z",
      id: "proj-from-b",
      title: "From device B",
      mode: "simple",
      color: "blue",
      progress_mode: "items",
      order_mode: "importance_default",
      archived_at: null,
      manual_sort_key: "a0",
    },
  );
  await syncNow();

  assert.equal(getDatabase().projects["proj-from-b"]?.title, "From device B");
});

test("a tombstone from another device beats a same-time local edit", async () => {
  const { backend, server } = createFakeBackend("u1");
  await startSync(backend);

  const item = calendarItems.create({ item_type: "task", title: "Doomed", date: "2026-09-04" });
  await syncNow();
  const at = getDatabase().calendar_items[item.id].updated_at;

  server.put(
    "calendar_items",
    remoteRow({ id: item.id, updated_at: at, deleted_at: at, title: "Doomed" }),
  );
  await syncNow();

  assert.ok(getDatabase().calendar_items[item.id].deleted_at);
});
