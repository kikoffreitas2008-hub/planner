import assert from "node:assert/strict";
import { test } from "node:test";

import { quoteForLocalDate, normalizeQuoteForComparison, type BibleQuote } from "./dailyQuote.ts";

function catalogue(size = 365): BibleQuote[] {
  return Array.from({ length: size }, (_, index) => ({
    id: `q-${index}`,
    text: `Verse ${index}`,
    reference: `Book ${index}:1`,
  }));
}

test("the same date always yields the same verse", () => {
  const list = catalogue();
  assert.deepEqual(quoteForLocalDate("2026-09-04", list), quoteForLocalDate("2026-09-04", list));
});

test("the epoch date maps to the first verse and advances by one per day", () => {
  const list = catalogue();
  assert.equal(quoteForLocalDate("2026-01-01", list).id, "q-0");
  assert.equal(quoteForLocalDate("2026-01-02", list).id, "q-1");
});

test("the cycle wraps after 365 days without repeating within a year", () => {
  const list = catalogue();
  assert.equal(quoteForLocalDate("2027-01-01", list).id, "q-0");
  const seen = new Set<string>();
  for (let day = 0; day < 365; day += 1) {
    const date = new Date(Date.UTC(2026, 0, 1 + day)).toISOString().slice(0, 10);
    seen.add(quoteForLocalDate(date, list).id);
  }
  assert.equal(seen.size, 365);
});

test("a catalogue that is not exactly 365 entries is rejected", () => {
  assert.throws(() => quoteForLocalDate("2026-09-04", catalogue(364)), RangeError);
});

test("the shipped catalogue has exactly 365 usable verses", async () => {
  const shipped = (await import("../data/bible-quotes.en-US.json", { with: { type: "json" } }))
    .default as BibleQuote[];
  assert.equal(shipped.length, 365);
  assert.ok(shipped.every((quote) => quote.text.trim() && quote.reference.trim()));
});

test("normalizeQuoteForComparison strips punctuation and accents", () => {
  assert.equal(normalizeQuoteForComparison("Trust in the LORD!"), "trust in the lord");
});
