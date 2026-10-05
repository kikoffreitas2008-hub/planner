import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

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

const { getDatabase, resetDatabaseForTests } = await import("./store.ts");
const { projects, projectItems } = await import("./repositories.ts");
const { projectItemAgendaItem } = await import("./agenda.ts");
const { prepareAgenda } = await import("../domain/agenda.ts");
const { calculateProjectProgress } = await import("../domain/progress.ts");

beforeEach(() => {
  resetDatabaseForTests();
});

function makeProject(overrides: Partial<Parameters<typeof projects.create>[0]> = {}) {
  return projects.create({
    title: "Kitchen",
    mode: "simple",
    color: "green",
    progress_mode: "items",
    ...overrides,
  });
}

test("creating a project stores it as active with importance ordering", () => {
  const project = makeProject();
  const stored = getDatabase().projects[project.id];
  assert.equal(stored.archived_at, null);
  assert.equal(stored.order_mode, "importance_default");
});

test("project items get a per-project ordering key", () => {
  const a = makeProject({ title: "A" });
  const b = makeProject({ title: "B" });
  const a1 = projectItems.create(a.id, null, { title: "a1" });
  const a2 = projectItems.create(a.id, null, { title: "a2" });
  const b1 = projectItems.create(b.id, null, { title: "b1" });
  assert.ok(getDatabase().project_items[a1.id].manual_sort_key < getDatabase().project_items[a2.id].manual_sort_key);
  // b1 starts a fresh sequence, not appended after a2.
  assert.ok(getDatabase().project_items[b1.id].manual_sort_key <= getDatabase().project_items[a2.id].manual_sort_key);
});

test("applyOrder writes ascending keys and switches the project to manual", () => {
  const project = makeProject();
  const one = projectItems.create(project.id, null, { title: "one", importance: "high" });
  const two = projectItems.create(project.id, null, { title: "two", importance: "low" });
  const three = projectItems.create(project.id, null, { title: "three" });

  projectItems.applyOrder(project.id, [three.id, one.id, two.id]);

  const key = (id: string) => getDatabase().project_items[id].manual_sort_key;
  assert.ok(key(three.id) < key(one.id) && key(one.id) < key(two.id));
  assert.equal(getDatabase().projects[project.id].order_mode, "manual");

  projects.restoreImportanceOrder(project.id);
  assert.equal(getDatabase().projects[project.id].order_mode, "importance_default");
});

test("scheduling an item makes it an agenda entry with the project colour", () => {
  const project = makeProject({ color: "purple" });
  const item = projectItems.create(project.id, null, { title: "Paint" });
  projectItems.schedule(item.id, {
    scheduled_date: "2026-09-10",
    scheduled_all_day: false,
    scheduled_starts_at: "2026-09-10T08:00:00.000Z",
    scheduled_ends_at: "2026-09-10T09:00:00.000Z",
  });

  const stored = getDatabase().project_items[item.id];
  const entry = projectItemAgendaItem(stored, getDatabase().projects[project.id]);
  assert.equal(entry.origin.kind, "project");
  assert.equal(entry.color, "purple");
  assert.equal(entry.title, "Paint");
  assert.deepEqual(
    prepareAgenda([entry]).map((e) => e.occurrenceId),
    [item.id],
  );

  projectItems.setCompleted(item.id, true);
  assert.ok(getDatabase().project_items[item.id].completed_at);
});

test("archiving hides a project without touching its data; restore brings it back", () => {
  const project = makeProject();
  projectItems.create(project.id, null, { title: "keep me" });
  projects.archive(project.id);
  assert.ok(getDatabase().projects[project.id].archived_at);
  assert.equal(Object.keys(getDatabase().project_items).length, 1);
  projects.restore(project.id);
  assert.equal(getDatabase().projects[project.id].archived_at, null);
});

test("permanent delete soft-deletes the project and its items and leaves a tombstone", () => {
  const project = makeProject();
  const child = projectItems.create(project.id, null, { title: "gone" });
  projects.purge(project.id);
  assert.ok(getDatabase().projects[project.id].deleted_at);
  assert.ok(getDatabase().project_items[child.id].deleted_at);
  const tombstones = Object.values(getDatabase().sync_tombstones);
  assert.equal(tombstones.length, 1);
  assert.equal(tombstones[0].entity_id, project.id);
});

test("structured progress counts leaf subtasks", () => {
  const project = makeProject({ mode: "structured", progress_mode: "items" });
  const task = projectItems.create(project.id, null, { title: "Task" });
  const sub1 = projectItems.create(project.id, task.id, { title: "s1" });
  projectItems.create(project.id, task.id, { title: "s2" });
  projectItems.setCompleted(sub1.id, true);

  const all = Object.values(getDatabase().project_items);
  const progress = calculateProjectProgress(all, "structured", "items");
  assert.deepEqual({ completed: progress.completed, total: progress.total }, { completed: 1, total: 2 });
});

test("projects.applyOrder writes ascending keys in the dropped order", () => {
  const a = makeProject({ title: "A" });
  const b = makeProject({ title: "B" });
  const c = makeProject({ title: "C" });

  projects.applyOrder([c.id, a.id, b.id]);

  const key = (id: string) => getDatabase().projects[id].manual_sort_key;
  assert.ok(key(c.id) < key(a.id) && key(a.id) < key(b.id));
});

test("project and task colours can change after creation; a task colour wins in the agenda", () => {
  const project = makeProject({ color: "green", mode: "structured" });
  projects.update(project.id, { color: "pink" });
  assert.equal(getDatabase().projects[project.id].color, "pink");

  const task = projectItems.create(project.id, null, { title: "Walls" });
  assert.equal(getDatabase().project_items[task.id].color, null);
  projectItems.update(task.id, { color: "orange" });
  projectItems.schedule(task.id, {
    scheduled_date: "2026-09-10",
    scheduled_all_day: true,
    scheduled_starts_at: null,
    scheduled_ends_at: null,
  });

  const entry = projectItemAgendaItem(
    getDatabase().project_items[task.id],
    getDatabase().projects[project.id],
  );
  assert.equal(entry.color, "orange");
});

test("an archived item stays done and still counts toward progress", () => {
  const project = makeProject();
  const done = projectItems.create(project.id, null, { title: "done" });
  projectItems.create(project.id, null, { title: "open" });
  projectItems.setCompleted(done.id, true);
  projectItems.archive(done.id);

  const stored = getDatabase().project_items[done.id];
  assert.ok(stored.archived_at);
  assert.ok(stored.completed_at);

  const all = Object.values(getDatabase().project_items).filter((item) => !item.deleted_at);
  const progress = calculateProjectProgress(all, "simple", "items");
  assert.equal(progress.completed, 1);
  assert.equal(progress.total, 2);

  projectItems.unarchive(done.id);
  assert.equal(getDatabase().project_items[done.id].archived_at, null);
});
