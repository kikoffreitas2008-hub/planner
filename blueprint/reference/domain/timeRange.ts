import { isISODateOnly, type ISODate, type ISODateTime } from "./date";

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const TIME_ZONE = "Europe/Lisbon";

interface TimeRangeInput {
  crossesMidnight: boolean;
  date: string;
  end: string;
  start: string;
}

type ValidTimeRange = {
  endsAt: ISODateTime;
  startsAt: ISODateTime;
  valid: true;
};

type InvalidTimeRange = {
  reason: string;
  requiresCrossMidnightConfirmation?: boolean;
  valid: false;
};

function addDay(date: ISODate) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10) as ISODate;
}

function localParts(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: TIME_ZONE,
    year: "numeric",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((candidate) => candidate.type === type)?.value);
  return {
    day: part("day"),
    hour: part("hour"),
    minute: part("minute"),
    month: part("month"),
    year: part("year"),
  };
}

function localDateTimeToISO(date: ISODate, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let guess = desired;

  for (let iteration = 0; iteration < 4; iteration += 1) {
    const actual = localParts(new Date(guess).toISOString());
    const wallClock = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
    );
    const difference = desired - wallClock;
    if (!difference) break;
    guess += difference;
  }
  return new Date(guess).toISOString() as ISODateTime;
}

export function validateTimeRange(
  input: TimeRangeInput,
): ValidTimeRange | InvalidTimeRange {
  if (
    !isISODateOnly(input.date) ||
    !TIME_PATTERN.test(input.start) ||
    !TIME_PATTERN.test(input.end)
  ) {
    return { reason: "Enter times in HH:mm format.", valid: false };
  }

  const startsAt = localDateTimeToISO(input.date, input.start);
  const endsOnNextDay = input.end <= input.start;
  if (endsOnNextDay && !input.crossesMidnight) {
    return {
      reason: "Confirm that it ends the next day.",
      requiresCrossMidnightConfirmation: true,
      valid: false,
    };
  }
  const endDate = endsOnNextDay ? addDay(input.date) : input.date;
  return {
    endsAt: localDateTimeToISO(endDate, input.end),
    startsAt,
    valid: true,
  };
}
