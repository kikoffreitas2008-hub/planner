export interface Versioned {
  updated_at: string;
  deleted_at: string | null;
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
  if (remote.updated_at > local.updated_at) return remote;
  if (remote.updated_at < local.updated_at) return local;
  if (Boolean(remote.deleted_at) && !local.deleted_at) return remote;
  return local;
}

/** True when the incoming remote row should replace what we hold locally. */
export function shouldApplyRemote<T extends Versioned>(local: T | undefined, remote: T): boolean {
  if (!local) return true;
  return pickWinner(local, remote) === remote;
}
