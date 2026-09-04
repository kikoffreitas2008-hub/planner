import type { ISODate, ISODateTime } from "@/domain/date";

const TIME_ZONE = "Europe/Lisbon";

function localParts(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    utcOfWall: Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")),
  };
}

/**
 * A Lisbon wall-clock date + minutes-since-midnight → the matching UTC ISO
 * instant, DST included. Converges the same way `domain/timeRange` does.
 */
export function wallClockToISO(date: ISODate, minutesSinceMidnight: number): ISODateTime {
  const [year, month, day] = date.split("-").map(Number);
  const minutes = ((minutesSinceMidnight % 1440) + 1440) % 1440;
  const desired = Date.UTC(year, month - 1, day, Math.floor(minutes / 60), minutes % 60);
  let guess = desired;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const diff = desired - localParts(new Date(guess).toISOString()).utcOfWall;
    if (!diff) break;
    guess += diff;
  }
  return new Date(guess).toISOString() as ISODateTime;
}

/** Minutes since Lisbon midnight for an ISO instant, relative to `onDate`. */
export function isoToMinutes(iso: string, onDate: ISODate): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const dateStr = `${get("year")}-${String(get("month")).padStart(2, "0")}-${String(get("day")).padStart(2, "0")}`;
  const dayOffset =
    (Date.parse(`${dateStr}T00:00:00.000Z`) - Date.parse(`${onDate}T00:00:00.000Z`)) / 86_400_000;
  return dayOffset * 1440 + get("hour") * 60 + get("minute");
}
