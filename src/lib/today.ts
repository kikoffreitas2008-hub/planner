import type { ISODate } from "@/domain/date";

const TIME_ZONE = "Europe/Lisbon";

/** The current calendar date in Lisbon, as `YYYY-MM-DD`. */
export function todayInLisbon(now: Date = new Date()): ISODate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now) as ISODate;
}

/** The day after `date` (calendar arithmetic, DST-safe because it is date-only). */
export function nextDate(date: ISODate): ISODate {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10) as ISODate;
}

export function previousDate(date: ISODate): ISODate {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10) as ISODate;
}

/** "Thursday · 04/09/2026" for a screen subtitle. */
export function formatDayHeading(date: ISODate): string {
  const at = new Date(`${date}T12:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "long",
  }).format(at);
  const dmy = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(at);
  return `${weekday} · ${dmy}`;
}

/** "09:00" for an ISO timestamp, in Lisbon 24-hour time. */
export function formatClock(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}
