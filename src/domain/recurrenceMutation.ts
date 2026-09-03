import type { ISODate, ISODateTime } from "./date.ts";
import type { CalendarItem } from "./entities.ts";
import {
  occurrencesForDate,
  type RecurrenceRule,
  type RecurringSource,
} from "./recurrence.ts";

export type RecurrenceScope = "one" | "future" | "all";

export type RecurrenceMutation =
  | {
      changes: Partial<CalendarItem>;
      kind: "update";
      newSeriesId?: string;
      timestamp?: ISODateTime;
    }
  | {
      kind: "delete";
      timestamp?: ISODateTime;
    }
  | {
      completedAt: ISODateTime | null;
      kind: "completion";
      newSeriesId?: string;
      timestamp?: ISODateTime;
    };

export type RecurrenceDatabaseCommand =
  | {
      changes: Partial<CalendarItem>;
      kind: "update_source";
      sourceId: string;
    }
  | {
      exceptionType: "cancelled" | "modified";
      kind: "upsert_exception";
      occurrenceDate: ISODate;
      originId: string;
      replacement: Record<string, unknown> | null;
    }
  | { kind: "insert_source"; source: CalendarItem }
  | {
      fromDate: ISODate;
      fromOriginId: string;
      kind: "migrate_exceptions";
      toOriginId: string;
    };

function previousDate(value: ISODate): ISODate {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10) as ISODate;
}

function ruleOf(source: CalendarItem): RecurrenceRule {
  if (!source.recurrence_rule) {
    throw new RangeError("The item does not belong to a recurring series.");
  }
  return JSON.parse(source.recurrence_rule) as RecurrenceRule;
}

function shortenedRule(source: CalendarItem, splitDate: ISODate) {
  return JSON.stringify({
    ...ruleOf(source),
    end: { date: previousDate(splitDate), kind: "date" as const },
  });
}

function occurrenceAt(source: CalendarItem, date: ISODate) {
  const recurringSource: RecurringSource = {
    allDay: source.all_day,
    color: source.color,
    completedAt: source.completed_at,
    createdAt: source.created_at,
    date: source.date,
    endsAt: source.ends_at,
    id: source.id,
    itemKind: source.item_type,
    location: source.location,
    notes: source.notes,
    recurrenceRule: ruleOf(source),
    startsAt: source.starts_at,
    title: source.title,
    userId: source.user_id,
  };
  const occurrence = occurrencesForDate(recurringSource, date, [])[0];
  if (!occurrence) {
    throw new RangeError("The date does not belong to the series.");
  }
  return occurrence;
}

function replacementOf(mutation: RecurrenceMutation) {
  switch (mutation.kind) {
    case "update":
      return mutation.changes as Record<string, unknown>;
    case "completion":
      return { completed_at: mutation.completedAt };
    case "delete":
      return null;
  }
}

function sourceChanges(mutation: RecurrenceMutation) {
  switch (mutation.kind) {
    case "update":
      return mutation.changes;
    case "completion":
      return { completed_at: mutation.completedAt };
    case "delete":
      return { deleted_at: mutation.timestamp };
  }
}

export function planRecurrenceMutation(
  source: CalendarItem,
  occurrenceDate: ISODate,
  scope: RecurrenceScope,
  mutation: RecurrenceMutation,
): readonly RecurrenceDatabaseCommand[] {
  ruleOf(source);
  if (scope === "one") {
    return [
      {
        exceptionType: mutation.kind === "delete" ? "cancelled" : "modified",
        kind: "upsert_exception",
        occurrenceDate,
        originId: source.id,
        replacement: replacementOf(mutation),
      },
    ];
  }

  if (scope === "all") {
    return [
      {
        changes: sourceChanges(mutation),
        kind: "update_source",
        sourceId: source.id,
      },
    ];
  }

  const shorten: RecurrenceDatabaseCommand = {
    changes: { recurrence_rule: shortenedRule(source, occurrenceDate) },
    kind: "update_source",
    sourceId: source.id,
  };
  if (mutation.kind === "delete") return [shorten];

  if (!mutation.newSeriesId) {
    throw new RangeError("The new series identifier is missing.");
  }
  const timestamp = mutation.timestamp ?? source.updated_at;
  const occurrence = occurrenceAt(source, occurrenceDate);
  const changes = sourceChanges(mutation);
  const nextSource: CalendarItem = {
    ...source,
    date: occurrenceDate,
    ends_at: occurrence.endsAt,
    starts_at: occurrence.startsAt,
    ...changes,
    created_at: timestamp,
    deleted_at: null,
    id: mutation.newSeriesId,
    series_started_at:
      (changes.starts_at as ISODateTime | null | undefined) ??
      occurrence.startsAt ??
      timestamp,
    updated_at: timestamp,
  } as CalendarItem;
  return [
    shorten,
    { kind: "insert_source", source: nextSource },
    {
      fromDate: occurrenceDate,
      fromOriginId: source.id,
      kind: "migrate_exceptions",
      toOriginId: mutation.newSeriesId,
    },
  ];
}
