import type { ISODate } from "./date.ts";
import { formatDuration } from "./duration.ts";
import { nextLocalDate } from "./overdue.ts";

export type TimeArea = "university" | "extras";

export const TIME_AREAS: readonly TimeArea[] = ["university", "extras"];

/** The first day that counts. Nothing earlier is asked about or summed. */
export const TRACKING_START = "2026-10-09" as ISODate;

/** Minutes per day: Monday–Thursday, then Friday–Sunday. */
const WEEKDAY_TARGETS: Record<TimeArea, number> = { university: 60, extras: 90 };
const WEEKEND_TARGETS: Record<TimeArea, number> = { university: 120, extras: 0 };

export interface TimeLogLike {
  date: ISODate;
  university_minutes: number;
  extras_minutes: number;
  updated_at: string;
  deleted_at: string | null;
}

export function targetFor(date: ISODate, area: TimeArea): number {
  // 0 = Monday … 6 = Sunday.
  const day = (new Date(`${date}T00:00:00.000Z`).getUTCDay() + 6) % 7;
  return (day <= 3 ? WEEKDAY_TARGETS : WEEKEND_TARGETS)[area];
}

export function minutesFor(log: TimeLogLike, area: TimeArea): number {
  return area === "university" ? log.university_minutes : log.extras_minutes;
}

/** One log per tracked day (the latest write), oldest day first. */
export function latestByDate<T extends TimeLogLike>(logs: readonly T[]): T[] {
  const byDate = new Map<string, T>();
  for (const log of logs) {
    if (log.deleted_at || log.date < TRACKING_START) continue;
    const current = byDate.get(log.date);
    if (!current || log.updated_at > current.updated_at) byDate.set(log.date, log);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function balanceFor(logs: readonly TimeLogLike[], area: TimeArea): number {
  return latestByDate(logs).reduce(
    (sum, log) => sum + minutesFor(log, area) - targetFor(log.date, area),
    0,
  );
}

/** Every day from the start up to yesterday that has no log yet. */
export function unansweredDays(logs: readonly TimeLogLike[], today: ISODate): ISODate[] {
  const logged = new Set(latestByDate(logs).map((log) => log.date));
  const days: ISODate[] = [];
  for (let day = TRACKING_START; day < today; day = nextLocalDate(day)) {
    if (!logged.has(day)) days.push(day);
  }
  return days;
}

export function formatBalance(minutes: number): { text: string; tone: "owed" | "ahead" | "even" } {
  if (minutes === 0) return { text: "Even", tone: "even" };
  const amount = formatDuration(Math.abs(minutes));
  return minutes < 0
    ? { text: `−${amount}`, tone: "owed" }
    : { text: `+${amount}`, tone: "ahead" };
}
