import { isISODateOnly } from "./date.ts";

export interface BibleQuote {
  id: string;
  text: string;
  reference: string;
}

const EPOCH = "2026-01-01";
const DAY_IN_MS = 86_400_000;

function dayNumber(date: string) {
  if (!isISODateOnly(date)) {
    throw new RangeError(`Invalid ISO calendar date: ${date}`);
  }
  return Date.parse(`${date}T00:00:00.000Z`) / DAY_IN_MS;
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

export function normalizeQuoteForComparison(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function quoteForLocalDate(
  date: string,
  catalogue: readonly BibleQuote[],
): BibleQuote {
  if (catalogue.length === 0) {
    throw new RangeError("The daily catalogue must contain at least one quote.");
  }

  // One quote per day, advancing by one each day and wrapping at the end of
  // the catalogue — so the cycle length is however many quotes there are.
  const cycleDay = dayNumber(date) - dayNumber(EPOCH);
  return catalogue[positiveModulo(cycleDay, catalogue.length)];
}
