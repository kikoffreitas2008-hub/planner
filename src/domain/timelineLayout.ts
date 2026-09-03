import { isISODateOnly, type ISODate } from "./date.ts";

export const TIMELINE_POINTS_PER_HOUR = 72;
export const TIMELINE_MINIMUM_HEIGHT = 24;

export interface TimelineInterval {
  allDay: boolean;
  endsAt: string | null;
  id: string;
  startsAt: string | null;
}

export interface TimelinePlacement {
  column: number;
  columnCount: number;
  height: number;
  id: string;
  top: number;
}

interface PositionedInterval {
  end: number;
  id: string;
  start: number;
}

function localParts(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Lisbon",
    year: "numeric",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((candidate) => candidate.type === type)?.value);
  return {
    date: `${part("year")}-${String(part("month")).padStart(2, "0")}-${String(
      part("day"),
    ).padStart(2, "0")}` as ISODate,
    minutes: part("hour") * 60 + part("minute"),
  };
}

function dayDifference(left: ISODate, right: ISODate) {
  return (
    (new Date(`${left}T00:00:00.000Z`).valueOf() -
      new Date(`${right}T00:00:00.000Z`).valueOf()) /
    86_400_000
  );
}

function minutesRelativeToDate(value: string, visibleDate: ISODate) {
  const local = localParts(value);
  return dayDifference(local.date, visibleDate) * 1440 + local.minutes;
}

function collisionGroups(intervals: readonly PositionedInterval[]) {
  const groups: PositionedInterval[][] = [];
  let current: PositionedInterval[] = [];
  let groupEnd = -Infinity;
  for (const interval of intervals) {
    if (current.length && interval.start >= groupEnd) {
      groups.push(current);
      current = [];
      groupEnd = -Infinity;
    }
    current.push(interval);
    groupEnd = Math.max(groupEnd, interval.end);
  }
  if (current.length) groups.push(current);
  return groups;
}

export function layoutTimeline(
  intervals: readonly TimelineInterval[],
  visibleDate: string,
  pointsPerHour = TIMELINE_POINTS_PER_HOUR,
): readonly TimelinePlacement[] {
  if (!isISODateOnly(visibleDate)) throw new RangeError("Invalid date.");
  const positioned = intervals
    .flatMap((interval): PositionedInterval[] => {
      if (interval.allDay || !interval.startsAt || !interval.endsAt) return [];
      const start = Math.max(
        0,
        minutesRelativeToDate(interval.startsAt, visibleDate),
      );
      const end = Math.min(
        1440,
        minutesRelativeToDate(interval.endsAt, visibleDate),
      );
      return end > start ? [{ end, id: interval.id, start }] : [];
    })
    .sort(
      (left, right) =>
        left.start - right.start ||
        right.end - left.end ||
        left.id.localeCompare(right.id),
    );

  return collisionGroups(positioned).flatMap((group) => {
    const activeEnds: number[] = [];
    const assigned = group.map((interval) => {
      let column = activeEnds.findIndex((end) => end <= interval.start);
      if (column < 0) column = activeEnds.length;
      activeEnds[column] = interval.end;
      return { column, interval };
    });
    const columnCount = Math.max(1, activeEnds.length);
    return assigned.map(({ column, interval }) => ({
      column,
      columnCount,
      height: Math.max(
        TIMELINE_MINIMUM_HEIGHT,
        ((interval.end - interval.start) / 60) * pointsPerHour,
      ),
      id: interval.id,
      top: (interval.start / 60) * pointsPerHour,
    }));
  });
}
