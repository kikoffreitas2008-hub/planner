/** A timed item reduced to minutes since midnight of its day. */
export interface TimeSlot {
  id: string;
  start: number;
  end: number;
}

/**
 * Re-time slots that were put in a new order. Each slot keeps its duration;
 * the session they span keeps its start and end, and the gaps between slots
 * stay at the same places in the sequence (zero for back-to-back items).
 *
 * 17:00–18:00 and 18:00–18:30, swapped → 17:00–17:30 and 17:30–18:30.
 *
 * `slotsInNewOrder` carries the slots' current times; the result has the same
 * order with the new times.
 */
export function redistributeTimes(slotsInNewOrder: readonly TimeSlot[]): TimeSlot[] {
  if (slotsInNewOrder.length < 2) return slotsInNewOrder.map((slot) => ({ ...slot }));

  const byTime = [...slotsInNewOrder].sort((left, right) => left.start - right.start);
  const gaps = byTime.slice(1).map((slot, index) => slot.start - byTime[index].end);

  let cursor = byTime[0].start;
  return slotsInNewOrder.map((slot, index) => {
    const start = cursor;
    const end = start + (slot.end - slot.start);
    cursor = end + (gaps[index] ?? 0);
    return { id: slot.id, start, end };
  });
}

/**
 * The part of `next` that differs from `previous`: from the first position
 * that changed to the last one. Both arrays hold the same ids.
 */
export function changedWindow(previous: readonly string[], next: readonly string[]): string[] {
  let first = 0;
  while (first < next.length && previous[first] === next[first]) first += 1;
  if (first === next.length) return [];
  let last = next.length - 1;
  while (last > first && previous[last] === next[last]) last -= 1;
  return next.slice(first, last + 1);
}
