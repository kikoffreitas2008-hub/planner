import assert from "node:assert/strict";
import { test } from "node:test";

import { estimateTextWidth, fitTitleSize } from "./fitText.ts";

// The phone case: a 390px screen gives a ~119px line inside a project card.
const LINE = 119;
const base = { width: LINE, maxSize: 24, minSize: 14, maxLines: 3 } as const;

test("a short title keeps the full size", () => {
  assert.equal(fitTitleSize({ ...base, title: "Casa" }).fontSize, 24);
  assert.equal(fitTitleSize({ ...base, title: "Work" }).fontSize, 24);
});

test("a long single word shrinks until the whole word fits on one line", () => {
  const { fontSize } = fitTitleSize({ ...base, title: "Universidade" });
  assert.ok(fontSize < 24, `expected a smaller size, got ${fontSize}`);
  assert.ok(fontSize >= 14);
  assert.ok(estimateTextWidth("Universidade", fontSize) <= LINE);
  // …and it is the largest such size: one step up no longer fits.
  assert.ok(estimateTextWidth("Universidade", fontSize + 1) > LINE);
});

test("a longer word never gets a bigger size than a shorter one", () => {
  const short = fitTitleSize({ ...base, title: "Universo" }).fontSize;
  const long = fitTitleSize({ ...base, title: "Universidade" }).fontSize;
  const longer = fitTitleSize({ ...base, title: "Universidades" }).fontSize;
  assert.ok(short >= long && long >= longer);
});

test("several words wrap between words and only the longest word limits the size", () => {
  const one = fitTitleSize({ ...base, title: "Universidade" }).fontSize;
  const many = fitTitleSize({ ...base, title: "Universidade de Lisboa" }).fontSize;
  assert.equal(many, one);
});

test("a word too long for even the smallest size falls back to the minimum", () => {
  assert.equal(fitTitleSize({ ...base, title: "Electroencefalografia" }).fontSize, 14);
});

test("many short words shrink until they fit within the line limit", () => {
  const title = "buy milk and eggs and bread";
  const { fontSize } = fitTitleSize({ ...base, title });
  assert.ok(fontSize < 24);
  // At the chosen size the wrapped text needs no more than three lines.
  assert.ok(estimateTextWidth(title, fontSize) <= LINE * 3);
});

test("a wider line allows a bigger size", () => {
  const narrow = fitTitleSize({ ...base, title: "Universidade" }).fontSize;
  const wide = fitTitleSize({ ...base, width: 200, title: "Universidade" }).fontSize;
  assert.ok(wide > narrow);
});

test("line height scales with the chosen size", () => {
  const { fontSize, lineHeight } = fitTitleSize({ ...base, title: "Universidade" });
  assert.equal(lineHeight, Math.round(fontSize * 1.2));
});

test("an empty title returns the maximum size", () => {
  assert.equal(fitTitleSize({ ...base, title: "   " }).fontSize, 24);
});
