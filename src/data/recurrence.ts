import { getDatabase, localUserId, upsertRow } from "@/data/store";
import { calendarItems } from "@/data/repositories";
import { createClientId, type ISODate, type ISODateTime } from "@/domain/date";
import type { CalendarItem, RecurrenceException } from "@/domain/entities";
import {
  planRecurrenceMutation,
  type RecurrenceDatabaseCommand,
  type RecurrenceMutation,
  type RecurrenceScope,
} from "@/domain/recurrenceMutation";

function nowISO(): ISODateTime {
  return new Date().toISOString();
}

function upsertException(
  originId: string,
  occurrenceDate: ISODate,
  type: "cancelled" | "modified",
  replacement: Record<string, unknown> | null,
): void {
  const timestamp = nowISO();
  const existing = Object.values(getDatabase().recurrence_exceptions).find(
    (exception) =>
      !exception.deleted_at &&
      exception.origin_id === originId &&
      exception.occurrence_date === occurrenceDate,
  );
  const shared = {
    id: existing?.id ?? createClientId(),
    user_id: existing?.user_id ?? localUserId(),
    created_at: existing?.created_at ?? timestamp,
    updated_at: timestamp,
    deleted_at: null,
    origin_id: originId,
    occurrence_date: occurrenceDate,
  };
  const row: RecurrenceException =
    type === "cancelled"
      ? { ...shared, exception_type: "cancelled", replacement_json: null }
      : {
          ...shared,
          exception_type: "modified",
          replacement_json: JSON.stringify(replacement ?? {}),
        };
  upsertRow("recurrence_exceptions", row);
}

/** Turn the domain's plan into concrete store writes. */
export function applyRecurrenceCommands(
  commands: readonly RecurrenceDatabaseCommand[],
): void {
  for (const command of commands) {
    switch (command.kind) {
      case "update_source":
        calendarItems.update(command.sourceId, command.changes as Partial<CalendarItem>);
        break;
      case "insert_source":
        upsertRow("calendar_items", { ...command.source, updated_at: nowISO() });
        break;
      case "upsert_exception":
        upsertException(
          command.originId,
          command.occurrenceDate,
          command.exceptionType,
          command.replacement,
        );
        break;
      case "migrate_exceptions": {
        const timestamp = nowISO();
        for (const exception of Object.values(getDatabase().recurrence_exceptions)) {
          if (
            !exception.deleted_at &&
            exception.origin_id === command.fromOriginId &&
            exception.occurrence_date >= command.fromDate
          ) {
            upsertRow("recurrence_exceptions", {
              ...exception,
              origin_id: command.toOriginId,
              updated_at: timestamp,
            });
          }
        }
        break;
      }
    }
  }
}

/**
 * Apply an edit to a recurring occurrence at one of the three scopes
 * (blueprint/01 §6.1). A "this and following" edit needs a fresh series id;
 * we mint one here.
 */
export function mutateRecurringOccurrence(
  source: CalendarItem,
  occurrenceDate: ISODate,
  scope: RecurrenceScope,
  mutation: RecurrenceMutation,
): void {
  const withSeriesId =
    scope === "future" && mutation.kind !== "delete"
      ? { ...mutation, newSeriesId: mutation.newSeriesId ?? createClientId() }
      : mutation;
  applyRecurrenceCommands(planRecurrenceMutation(source, occurrenceDate, scope, withSeriesId));
}
