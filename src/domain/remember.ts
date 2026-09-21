import type { RememberItem } from "./entities.ts";

/**
 * Reminders are standing notes: they stay on Today, every day, until they are
 * deleted. `RememberItem.date` only records the day one was created and plays no
 * part in what is shown. Order is the user's manual order; ties (rows written
 * by different devices can share a key) fall back to creation time, then id, so
 * every device agrees on one sequence.
 */
export function visibleRememberItems(
  rows: Readonly<Record<string, RememberItem>>,
): RememberItem[] {
  return Object.values(rows)
    .filter((item) => !item.deleted_at)
    .sort(
      (a, b) =>
        compare(a.manual_sort_key, b.manual_sort_key) ||
        compare(a.created_at, b.created_at) ||
        compare(a.id, b.id),
    );
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
