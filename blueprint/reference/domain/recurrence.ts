import { createClientId, type ISODate, type ISODateTime } from "./date";
import type { PaletteColor, RecurrenceException } from "./entities";

export interface RecurrenceRule {
  frequency: "daily" | "weekdays" | "weekly" | "monthly" | "custom";
  interval: number;
  weekdays?: readonly number[];
  end:
    | { kind: "never" }
    | { kind: "date"; date: string }
    | { kind: "count"; count: number };
}

export interface RecurringSource {
  allDay: boolean;
  color: PaletteColor;
  completedAt: ISODateTime | null;
  createdAt: ISODateTime;
  date: ISODate;
  endsAt: ISODateTime | null;
  id: string;
  itemKind: "task" | "event";
  location?: string | null;
  notes: string | null;
  notificationOffsets?: readonly number[];
  recurrenceRule?: RecurrenceRule;
  startsAt: ISODateTime | null;
  title: string;
  userId: string;
}

export interface AgendaOccurrence extends Omit<
  RecurringSource,
  "recurrenceRule"
> {
  occurrenceId: string;
  recurrenceRule: RecurrenceRule;
  sourceId: string;
}

const timeZone = "Europe/Lisbon";

function asDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function addDays(value: string, days: number): ISODate {
  const date = asDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10) as ISODate;
}

function daysBetween(start: string, end: string) {
  return Math.round(
    (asDate(end).valueOf() - asDate(start).valueOf()) / 86_400_000,
  );
}

function mondayStart(value: string) {
  const date = asDate(value);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

function monthsBetween(start: string, end: string) {
  const left = asDate(start);
  const right = asDate(end);
  return (
    (right.getUTCFullYear() - left.getUTCFullYear()) * 12 +
    right.getUTCMonth() -
    left.getUTCMonth()
  );
}

function daysInMonth(value: string) {
  const date = asDate(value);
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
}

function normalizedRule(rule: RecurrenceRule) {
  if (!Number.isInteger(rule.interval) || rule.interval < 1) {
    throw new RangeError("The recurrence interval must be positive.");
  }
  if (rule.end.kind === "count" && rule.end.count < 1) {
    throw new RangeError("The recurrence count must be positive.");
  }
  return rule;
}

function matchesPattern(
  start: ISODate,
  candidate: ISODate,
  rule: RecurrenceRule,
) {
  const elapsedDays = daysBetween(start, candidate);
  if (elapsedDays < 0) return false;
  if (candidate === start) return true;
  switch (rule.frequency) {
    case "daily":
    case "custom":
      return elapsedDays % rule.interval === 0;
    case "weekdays": {
      const day = asDate(candidate).getUTCDay();
      if (day === 0 || day === 6) return false;
      let eligible = 0;
      for (let index = 0; index <= elapsedDays; index += 1) {
        const weekday = asDate(addDays(start, index)).getUTCDay();
        if (weekday !== 0 && weekday !== 6) eligible += 1;
      }
      return (eligible - 1) % rule.interval === 0;
    }
    case "weekly": {
      const weeks = Math.floor(
        daysBetween(mondayStart(start), mondayStart(candidate)) / 7,
      );
      const weekdays = rule.weekdays?.length
        ? rule.weekdays
        : [asDate(start).getUTCDay()];
      return (
        weeks >= 0 &&
        weeks % rule.interval === 0 &&
        weekdays.includes(asDate(candidate).getUTCDay())
      );
    }
    case "monthly": {
      const months = monthsBetween(start, candidate);
      const targetDay = Math.min(
        asDate(start).getUTCDate(),
        daysInMonth(candidate),
      );
      return (
        months >= 0 &&
        months % rule.interval === 0 &&
        asDate(candidate).getUTCDate() === targetDay
      );
    }
  }
}

function occurrenceNumber(
  start: ISODate,
  candidate: ISODate,
  rule: RecurrenceRule,
) {
  const elapsed = daysBetween(start, candidate);
  let count = 0;
  for (let index = 0; index <= elapsed; index += 1) {
    if (matchesPattern(start, addDays(start, index), rule)) count += 1;
  }
  return count;
}

interface LocalParts {
  date: ISODate;
  hour: number;
  minute: number;
  second: number;
}

function localParts(value: string): LocalParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((candidate) => candidate.type === type)?.value);
  return {
    date: `${part("year")}-${String(part("month")).padStart(2, "0")}-${String(
      part("day"),
    ).padStart(2, "0")}` as ISODate,
    hour: part("hour"),
    minute: part("minute"),
    second: part("second"),
  };
}

function wallClockEpoch(
  date: ISODate,
  hour: number,
  minute: number,
  second: number,
) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day, hour, minute, second);
}

function localDateTimeToISO(
  date: ISODate,
  parts: Pick<LocalParts, "hour" | "minute" | "second">,
) {
  const desired = wallClockEpoch(date, parts.hour, parts.minute, parts.second);
  let guess = desired;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const actual = localParts(new Date(guess).toISOString());
    const difference =
      desired -
      wallClockEpoch(actual.date, actual.hour, actual.minute, actual.second);
    if (!difference) break;
    guess += difference;
  }
  return new Date(guess).toISOString() as ISODateTime;
}

function moveDateTime(
  value: ISODateTime | null,
  sourceDate: ISODate,
  targetDate: ISODate,
) {
  if (!value) return null;
  const parts = localParts(value);
  const dayOffset = daysBetween(sourceDate, parts.date);
  return localDateTimeToISO(addDays(targetDate, dayOffset), parts);
}

function applyReplacement(
  occurrence: AgendaOccurrence,
  replacementJson: string | null,
) {
  if (!replacementJson) return occurrence;
  const replacement = JSON.parse(replacementJson) as Record<string, unknown>;
  return {
    ...occurrence,
    ...(typeof replacement.date === "string"
      ? { date: replacement.date as ISODate }
      : {}),
    ...(typeof replacement.title === "string"
      ? { title: replacement.title }
      : {}),
    ...(typeof replacement.notes === "string" || replacement.notes === null
      ? { notes: replacement.notes as string | null }
      : {}),
    ...(typeof replacement.location === "string" ||
    replacement.location === null
      ? { location: replacement.location as string | null }
      : {}),
    ...(typeof replacement.all_day === "boolean"
      ? { allDay: replacement.all_day }
      : {}),
    ...(typeof replacement.color === "string"
      ? { color: replacement.color as PaletteColor }
      : {}),
    ...(typeof replacement.completedAt === "string" ||
    replacement.completedAt === null
      ? { completedAt: replacement.completedAt as ISODateTime | null }
      : {}),
    ...(typeof replacement.completed_at === "string" ||
    replacement.completed_at === null
      ? { completedAt: replacement.completed_at as ISODateTime | null }
      : {}),
    ...(typeof replacement.startsAt === "string"
      ? { startsAt: replacement.startsAt as ISODateTime }
      : {}),
    ...(typeof replacement.starts_at === "string" ||
    replacement.starts_at === null
      ? { startsAt: replacement.starts_at as ISODateTime | null }
      : {}),
    ...(typeof replacement.endsAt === "string"
      ? { endsAt: replacement.endsAt as ISODateTime }
      : {}),
    ...(typeof replacement.ends_at === "string" || replacement.ends_at === null
      ? { endsAt: replacement.ends_at as ISODateTime | null }
      : {}),
  };
}

export function occurrencesForDate(
  source: RecurringSource,
  date: string,
  exceptions: readonly RecurrenceException[],
): readonly AgendaOccurrence[] {
  const rule = normalizedRule(
    source.recurrenceRule ?? {
      end: { kind: "count", count: 1 },
      frequency: "daily",
      interval: 1,
    },
  );
  const candidate = date as ISODate;
  if (!matchesPattern(source.date, candidate, rule)) return [];
  if (rule.end.kind === "date" && candidate > rule.end.date) return [];
  if (
    rule.end.kind === "count" &&
    occurrenceNumber(source.date, candidate, rule) > rule.end.count
  ) {
    return [];
  }
  const exception = exceptions.find(
    (value) =>
      !value.deleted_at &&
      value.origin_id === source.id &&
      value.occurrence_date === candidate,
  );
  if (exception?.exception_type === "cancelled") return [];
  const occurrence: AgendaOccurrence = {
    ...source,
    date: candidate,
    endsAt: moveDateTime(source.endsAt, source.date, candidate),
    occurrenceId: `${source.id}@${candidate}`,
    recurrenceRule: rule,
    sourceId: source.id,
    startsAt: moveDateTime(source.startsAt, source.date, candidate),
  };
  return [
    exception?.exception_type === "modified"
      ? applyReplacement(occurrence, exception.replacement_json)
      : occurrence,
  ];
}

export function splitRecurringSeries(
  source: RecurringSource & { recurrenceRule: RecurrenceRule },
  splitDate: ISODate,
  changes: Partial<RecurringSource>,
) {
  if (splitDate <= source.date) {
    throw new RangeError("The split must occur after the series starts.");
  }
  const occurrence = occurrencesForDate(source, splitDate, [])[0];
  if (!occurrence) {
    throw new RangeError("The selected date does not belong to the series.");
  }
  return {
    previous: {
      ...source,
      recurrenceRule: {
        ...source.recurrenceRule,
        end: { date: addDays(splitDate, -1), kind: "date" as const },
      },
    },
    following: {
      ...source,
      ...changes,
      date: splitDate,
      endsAt: occurrence.endsAt,
      id: createClientId(),
      startsAt: occurrence.startsAt,
    },
  };
}
