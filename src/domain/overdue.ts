import type { AgendaItem } from "./agenda.ts";
import { isISODateOnly, type ISODate } from "./date.ts";
import { validateTimeRange } from "./timeRange.ts";

export function nextLocalDate(date: ISODate): ISODate {
  if (!isISODateOnly(date)) {
    throw new RangeError(`Invalid ISO calendar date: ${date}`);
  }
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10) as ISODate;
}

export function overdueCandidates(
  items: readonly AgendaItem[],
  today: ISODate,
  lastReviewDate: ISODate | null,
) {
  if (lastReviewDate === today) return [];
  return items.filter(
    (item) => !item.deletedAt && !item.completedAt && item.date < today,
  );
}

interface OverdueRescheduleInput {
  date: string;
  end: string;
  start: string;
}

export function validateOverdueReschedule(
  item: AgendaItem,
  input: OverdueRescheduleInput,
) {
  if (
    !isISODateOnly(input.date) ||
    input.date === item.date ||
    !input.start ||
    !input.end
  ) {
    return {
      reason: "Choose a new date and time.",
      valid: false as const,
    };
  }
  const range = validateTimeRange({
    crossesMidnight: input.end <= input.start,
    date: input.date,
    end: input.end,
    start: input.start,
  });
  if (!range.valid) return range;
  return {
    date: input.date as ISODate,
    endsAt: range.endsAt,
    startsAt: range.startsAt,
    valid: true as const,
  };
}
