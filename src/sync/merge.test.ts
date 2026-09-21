import assert from "node:assert/strict";
import { test } from "node:test";

import { pickWinner, shouldApplyRemote, type Versioned } from "./merge.ts";

const A: Versioned = { updated_at: "2026-09-04T10:00:00.000Z", deleted_at: null };
const NEWER: Versioned = { updated_at: "2026-09-04T11:00:00.000Z", deleted_at: null };
const OLDER: Versioned = { updated_at: "2026-09-04T09:00:00.000Z", deleted_at: null };
const TOMBSTONE_SAME: Versioned = {
  updated_at: "2026-09-04T10:00:00.000Z",
  deleted_at: "2026-09-04T10:00:00.000Z",
};

test("no local row — the remote always wins", () => {
  assert.equal(pickWinner(undefined, A), A);
  assert.equal(shouldApplyRemote(undefined, A), true);
});

test("the newer updated_at wins", () => {
  assert.equal(pickWinner(A, NEWER), NEWER);
  assert.equal(pickWinner(A, OLDER), A);
});

test("on a tie a tombstone beats an active edit", () => {
  assert.equal(pickWinner(A, TOMBSTONE_SAME), TOMBSTONE_SAME);
  assert.equal(pickWinner(TOMBSTONE_SAME, A), TOMBSTONE_SAME);
});

test("an edit made after a restore (newer, active) beats an older delete", () => {
  const restored: Versioned = { updated_at: "2026-09-04T12:00:00.000Z", deleted_at: null };
  const oldDelete: Versioned = {
    updated_at: "2026-09-04T10:00:00.000Z",
    deleted_at: "2026-09-04T10:00:00.000Z",
  };
  assert.equal(pickWinner(restored, oldDelete), restored);
});

test("timestamps are compared as instants, not as strings", () => {
  // What Postgres returns for a `timestamptz` vs what the client writes.
  const remote: Versioned = { updated_at: "2026-09-04T10:00:00.123456+00:00", deleted_at: null };
  const sameInstant: Versioned = { updated_at: "2026-09-04T10:00:00.123Z", deleted_at: null };
  const older: Versioned = { updated_at: "2026-09-04T09:59:59.999Z", deleted_at: null };

  // As raw strings "…+00:00" sorts before "…Z", which used to make the remote lose.
  assert.equal(shouldApplyRemote(older, remote), true);
  assert.equal(shouldApplyRemote(sameInstant, remote), false);
});

test("shouldApplyRemote is false when the local row already wins", () => {
  assert.equal(shouldApplyRemote(NEWER, OLDER), false);
  assert.equal(shouldApplyRemote(A, NEWER), true);
});
