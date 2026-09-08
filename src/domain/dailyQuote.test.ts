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

test("the cycle wraps after `catalogue.length` days without repeating a verse", () => {
  const list = catalogue(120);
  const seen = new Set<string>();
  for (let day = 0; day < 120; day += 1) {
    const date = new Date(Date.UTC(2026, 0, 1 + day)).toISOString().slice(0, 10);
    seen.add(quoteForLocalDate(date, list).id);
  }
  assert.equal(seen.size, 120);
  // Day 120 wraps back to the first verse.
  assert.equal(quoteForLocalDate("2026-05-01", list).id, quoteForLocalDate("2026-01-01", list).id);
});

test("an empty catalogue is rejected", () => {
  assert.throws(() => quoteForLocalDate("2026-09-04", catalogue(0)), RangeError);
});

test("the shipped catalogue has at least 100 usable verses", async () => {
  const shipped = (await import("../data/bible-quotes.en-US.json", { with: { type: "json" } }))
    .default as BibleQuote[];
  assert.ok(shipped.length >= 100, `expected >= 100 verses, got ${shipped.length}`);
  assert.ok(shipped.every((quote) => quote.text.trim() && quote.reference.trim()));
  assert.equal(new Set(shipped.map((quote) => quote.id)).size, shipped.length, "ids must be unique");
});

test("normalizeQuoteForComparison strips punctuation and accents", () => {
  assert.equal(normalizeQuoteForComparison("Trust in the LORD!"), "trust in the lord");
});
