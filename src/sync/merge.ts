export interface Versioned {
  updated_at: string;
  deleted_at: string | null;
}

/**
 * Timestamps reach us in two shapes: locally written rows carry
 * `new Date().toISOString()` (`2026-09-21T10:00:00.123Z`) while rows pulled
 * from Postgres carry a `timestamptz` (`2026-09-21T10:00:00.123456+00:00`).
 * Comparing those as strings is wrong — `+` sorts before `.` and before `Z` —
 * so the same instant written by two devices would not compare equal and a
 * remote row could lose to an older local one. Compare instants instead, and
 * fall back to the string only if a value is unparseable.
 */
function instant(value: string): number {
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? Number.NaN : ms;
}

/** -1, 0 or 1 — `a` older, same instant, or newer than `b`. */
export function compareVersions(a: string, b: string): number {
  const left = instant(a);
  const right = instant(b);
  if (Number.isNaN(left) || Number.isNaN(right)) {
    return a < b ? -1 : a > b ? 1 : 0;
  }
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Last-write-wins with tombstone precedence (blueprint/04 §4):
 * - the change with the newest valid `updated_at` wins;
 * - on a tie, a tombstone (deleted) beats an active edit;
 * - an edit made after an explicit restore has a newer `updated_at`, so it
 *   naturally beats the older delete.
 */
export function pickWinner<T extends Versioned>(local: T | undefined, remote: T): T {
  if (!local) return remote;
  const order = compareVersions(remote.updated_at, local.updated_at);
  if (order > 0) return remote;
  if (order < 0) return local;
  if (Boolean(remote.deleted_at) && !local.deleted_at) return remote;
  return local;
}

/** True when the incoming remote row should replace what we hold locally. */
export function shouldApplyRemote<T extends Versioned>(local: T | undefined, remote: T): boolean {
  if (!local) return true;
  return pickWinner(local, remote) === remote;
}
