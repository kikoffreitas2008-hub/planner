import { useMemo } from "react";

import { calendarAgendaItem } from "@/data/agenda";
import { useTable, useUserSettings } from "@/data/store";
import type { AgendaItem } from "@/domain/agenda";
import type { ISODate } from "@/domain/date";
import { overdueCandidates } from "@/domain/overdue";

/**
 * Unfinished items from previous days, for the review sheet on the first
 * launch after the date changes. Recurring series are left out — an occurrence
 * is never "overdue" in the same way. Returns [] once the review has run today
 * (blueprint/01 section 3.6).
 */
export function useOverdueCandidates(today: ISODate): readonly AgendaItem[] {
  const calendarItems = useTable("calendar_items");
  const userSettings = useUserSettings();
  const lastReview = userSettings?.last_overdue_review_date ?? null;

  return useMemo(() => {
    const past = Object.values(calendarItems)
      .filter(
        (item) =>
          !item.deleted_at && !item.completed_at && !item.recurrence_rule && item.date < today,
      )
      .map(calendarAgendaItem);
    return overdueCandidates(past, today, lastReview);
  }, [calendarItems, today, lastReview]);
}
