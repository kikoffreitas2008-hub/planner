import { isISODateOnly, startOfWeekISO, type ISODate } from "./date.ts";

export type CalendarView = "month" | "week" | "day";

/** The views in coarse→fine order — the order the switcher lists them. */
export const CALENDAR_VIEWS: readonly CalendarView[] = ["month", "week", "day"] as const;

/** "month" → "Month". Used for the switcher trigger and its menu rows. */
export function calendarViewLabel(view: CalendarView): string {
  return view[0].toUpperCase() + view.slice(1);
}

export interface CalendarDateState {
  selectedDate: ISODate;
  view: CalendarView;
  visibleAnchor: ISODate;
}

export interface CalendarDayCell {
  date: ISODate;
  day: number;
  inVisibleMonth: boolean;
  weekdayIndex: number;
}

export interface WeekdayLabel {
  compact: string;
  full: string;
}

function requireDate(value: string): ISODate {
  if (!isISODateOnly(value)) throw new RangeError("Invalid date.");
  return value;
}

function toUTC(value: string) {
  return new Date(`${requireDate(value)}T00:00:00.000Z`);
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10) as ISODate;
}

function addDays(value: string, amount: number) {
  const date = toUTC(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return iso(date);
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function addMonthsClamped(value: string, amount: number) {
  const date = toUTC(value);
  const day = date.getUTCDate();
  const target = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1),
  );
  target.setUTCDate(
    Math.min(day, daysInMonth(target.getUTCFullYear(), target.getUTCMonth())),
  );
  return iso(target);
}

export function monthGrid(anchor: string): readonly CalendarDayCell[] {
  const visible = toUTC(anchor);
  const year = visible.getUTCFullYear();
  const month = visible.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  first.setUTCDate(first.getUTCDate() - mondayOffset);
  const visibleDays = daysInMonth(year, month);
  const required = mondayOffset + visibleDays;
  const cellCount = required <= 35 ? 35 : 42;

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(first);
    date.setUTCDate(first.getUTCDate() + index);
    return {
      date: iso(date),
      day: date.getUTCDate(),
      inVisibleMonth: date.getUTCMonth() === month,
      weekdayIndex: index % 7,
    };
  });
}

export function weekRange(anchor: string): readonly ISODate[] {
  const start = startOfWeekISO(requireDate(anchor));
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function moveCalendarAnchor(
  state: CalendarDateState,
  direction: -1 | 1,
): CalendarDateState {
  const visibleAnchor =
    state.view === "month"
      ? addMonthsClamped(state.visibleAnchor, direction)
      : addDays(
          state.visibleAnchor,
          direction * (state.view === "week" ? 7 : 1),
        );
  return { ...state, visibleAnchor };
}

export function selectCalendarDate(
  state: CalendarDateState,
  selectedDate: ISODate,
): CalendarDateState {
  requireDate(selectedDate);
  return { ...state, selectedDate, visibleAnchor: selectedDate };
}

export function weekdayLabels(): readonly WeekdayLabel[] {
  const monday = new Date("2026-01-05T12:00:00.000Z");
  const compact = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    const full = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Lisbon",
      weekday: "long",
    })
      .format(date)
      .replace(/\.$/, "")
      .toLocaleLowerCase("en-GB");
    return { compact: compact[index], full };
  });
}

export function calendarMonthLabel(anchor: string) {
  const label = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    timeZone: "Europe/Lisbon",
    year: "numeric",
  }).format(toUTC(anchor));
  return label.charAt(0).toLocaleUpperCase("en-GB") + label.slice(1);
}

export function calendarDayLabel(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Lisbon",
    weekday: "long",
  }).format(toUTC(date));
}
