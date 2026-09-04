// A tiny module-level guard so a horizontal swipe on a row does not also
// register as a tap on the card (which would open the editor). SwipeableRow
// stamps the time on drag; the card checks it before handling a press.

let lastSwipeAt = 0;

export function markSwipe(): void {
  lastSwipeAt = Date.now();
}

export function swipedRecently(withinMs = 450): boolean {
  return Date.now() - lastSwipeAt < withinMs;
}
