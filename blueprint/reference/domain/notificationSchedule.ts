import type { AgendaItem } from "./agenda";
import type { ISODateTime } from "./date";

export interface DesiredNotification {
  body: string;
  id: string;
  offsetMinutes: number;
  title: "Planner";
  triggerAt: ISODateTime;
}

export function desiredNotifications(
  items: readonly AgendaItem[],
  now: ISODateTime = new Date().toISOString(),
): readonly DesiredNotification[] {
  const current = new Date(now).valueOf();
  const unique = new Map<string, DesiredNotification>();
  for (const item of items) {
    if (item.completedAt || !item.startsAt) continue;
    const start = new Date(item.startsAt).valueOf();
    for (const offset of new Set(item.notificationOffsets ?? [])) {
      if (!Number.isInteger(offset) || offset < 0) continue;
      const trigger = start - offset * 60_000;
      if (trigger <= current) continue;
      const id = `planeador:${item.occurrenceId}:${offset}`;
      unique.set(id, {
        body: item.title,
        id,
        offsetMinutes: offset,
        title: "Planner",
        triggerAt: new Date(trigger).toISOString(),
      });
    }
  }
  return [...unique.values()].sort(
    (left, right) =>
      left.triggerAt.localeCompare(right.triggerAt) ||
      left.id.localeCompare(right.id),
  );
}
