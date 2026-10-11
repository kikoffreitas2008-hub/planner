import assert from "node:assert/strict";
import { test } from "node:test";

import { changedWindow, redistributeTimes } from "./timeSwap.ts";

const at = (hours: number, minutes = 0) => hours * 60 + minutes;

test("swapping two back-to-back slots of equal length swaps their times", () => {
  const result = redistributeTimes([
    { id: "b", start: at(18), end: at(19) },
    { id: "a", start: at(17), end: at(18) },
  ]);
  assert.deepEqual(result, [
    { id: "b", start: at(17), end: at(18) },
    { id: "a", start: at(18), end: at(19) },
  ]);
});

test("swapping keeps each duration and the session's start and end", () => {
  const result = redistributeTimes([
    { id: "b", start: at(18), end: at(18, 30) },
    { id: "a", start: at(17), end: at(18) },
  ]);
  assert.deepEqual(result, [
    { id: "b", start: at(17), end: at(17, 30) },
    { id: "a", start: at(17, 30), end: at(18, 30) },
  ]);
});

test("a gap between the slots stays where it was in the sequence", () => {
  const result = redistributeTimes([
    { id: "b", start: at(19), end: at(19, 30) },
    { id: "a", start: at(17), end: at(18) },
  ]);
  assert.deepEqual(result, [
    { id: "b", start: at(17), end: at(17, 30) },
    { id: "a", start: at(18, 30), end: at(19, 30) },
  ]);
});

test("three slots are laid out back to back in the new order", () => {
  const result = redistributeTimes([
    { id: "c", start: at(18, 30), end: at(18, 45) },
    { id: "a", start: at(17), end: at(18) },
    { id: "b", start: at(18), end: at(18, 30) },
  ]);
  assert.deepEqual(result, [
    { id: "c", start: at(17), end: at(17, 15) },
    { id: "a", start: at(17, 15), end: at(18, 15) },
    { id: "b", start: at(18, 15), end: at(18, 45) },
  ]);
});

test("an order that already matches the times changes nothing", () => {
  const slots = [
    { id: "a", start: at(17), end: at(18) },
    { id: "b", start: at(18), end: at(18, 30) },
  ];
  assert.deepEqual(redistributeTimes(slots), slots);
});

test("fewer than two slots are returned unchanged", () => {
  assert.deepEqual(redistributeTimes([]), []);
  assert.deepEqual(redistributeTimes([{ id: "a", start: at(9), end: at(10) }]), [
    { id: "a", start: at(9), end: at(10) },
  ]);
});

test("changedWindow returns the stretch of the new order that moved", () => {
  assert.deepEqual(changedWindow(["a", "b", "c", "d"], ["a", "d", "b", "c"]), ["d", "b", "c"]);
  assert.deepEqual(changedWindow(["a", "b", "c"], ["b", "a", "c"]), ["b", "a"]);
  assert.deepEqual(changedWindow(["a", "b"], ["a", "b"]), []);
});
