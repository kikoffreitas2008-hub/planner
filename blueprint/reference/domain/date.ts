export type ISODate = `${number}-${number}-${number}`;
export type ISODateTime = string;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }

  for (let index = 0; index < length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }

  return bytes;
}

export function createClientId(): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

  return [
    value.slice(0, 4).join(""),
    value.slice(4, 6).join(""),
    value.slice(6, 8).join(""),
    value.slice(8, 10).join(""),
    value.slice(10, 16).join(""),
  ].join("-");
}

export function isISODateOnly(value: string): value is ISODate {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function requireISODate(value: string): ISODate {
  if (!isISODateOnly(value)) {
    throw new RangeError(`Invalid ISO calendar date: ${value}`);
  }

  return value;
}

export function startOfWeekISO(value: string): ISODate {
  const isoDate = requireISODate(value);
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10) as ISODate;
}

export function formatTimeLabel(value: string, timeZone: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    throw new RangeError(`Invalid ISO date and time: ${value}`);
  }

  return new Intl.DateTimeFormat("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(date);
}

export function formatTimeRange(
  startsAt: string,
  endsAt: string,
  timeZone: string,
): string {
  return `${formatTimeLabel(startsAt, timeZone)}–${formatTimeLabel(endsAt, timeZone)}`;
}
