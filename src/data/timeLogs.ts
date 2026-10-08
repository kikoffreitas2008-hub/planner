import { useMemo } from "react";

import { useTable } from "@/data/store";
import type { ISODate } from "@/domain/date";
import type { TimeLog } from "@/domain/entities";
import {
  balanceFor,
  latestByDate,
  TIME_AREAS,
  unansweredDays,
  type TimeArea,
} from "@/domain/timeTracker";

/** One log per tracked day, oldest first. */
export function useTimeLogs(): readonly TimeLog[] {
  const rows = useTable("time_logs");
  return useMemo(() => latestByDate(Object.values(rows)), [rows]);
}

export function useTimeBalances(): Record<TimeArea, number> {
  const logs = useTimeLogs();
  return useMemo(
    () =>
      Object.fromEntries(TIME_AREAS.map((area) => [area, balanceFor(logs, area)])) as Record<
        TimeArea,
        number
      >,
    [logs],
  );
}

/** Past days still waiting for an answer (the end-of-day pop-up). */
export function useUnansweredDays(today: ISODate): readonly ISODate[] {
  const logs = useTimeLogs();
  return useMemo(() => unansweredDays(logs, today), [logs, today]);
}
