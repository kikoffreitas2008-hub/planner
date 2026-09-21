/**
 * Sizing for the titles on project and task cards.
 *
 * A card title has a fixed line width and a line limit. At a fixed font size a
 * long single word ("Universidade") is wider than the line and the browser
 * breaks it mid-word — "Univers" / "idade". Instead, pick the largest size at
 * which every word fits on one line and the text stays within the line limit.
 *
 * Text is measured with a per-character estimate rather than the real font.
 * `adjustsFontSizeToFit` is not available on the web build (the iPhone app runs
 * as a PWA), a measured approach would need a different mechanism per platform,
 * and a pure function is testable. The estimate leans wide on purpose: a title
 * a little smaller than it needed to be reads fine, a broken word does not.
 */

/** Widths in em for a bold system sans-serif; tuned wide, see `SAFETY`. */
const NARROW = new Set("iIl|.,:;'!`");
const SLIM = new Set("jtfr()[]-/\\ \"");
const WIDE = new Set("mwMW@%");

const SAFETY = 1.06;
const SPACE_EM = 0.28;

/**
 * The smallest a card title is allowed to get. Small type is better than a
 * broken word, but below this it stops being readable on a card.
 */
export const MIN_TITLE_SIZE = 12;

function charEm(char: string): number {
  if (char === " ") return SPACE_EM;
  if (NARROW.has(char)) return 0.3;
  if (SLIM.has(char)) return 0.4;
  if (WIDE.has(char)) return 0.9;
  if (char >= "0" && char <= "9") return 0.62;
  // Upper-case letters (including accented ones) run wider than lower-case.
  if (char.toLowerCase() !== char && char.toUpperCase() === char) return 0.72;
  return 0.6;
}

/** Estimated rendered width, in px, of `text` on one line at `fontSize`. */
export function estimateTextWidth(text: string, fontSize: number): number {
  let em = 0;
  for (const char of text) em += charEm(char);
  return em * fontSize * SAFETY;
}

export interface FitTitleOptions {
  title: string;
  /** Width of one line, in px. */
  width: number;
  maxSize: number;
  minSize: number;
  maxLines: number;
  /** Line height as a multiple of the font size. */
  lineHeightRatio?: number;
}

export interface FittedTitle {
  fontSize: number;
  lineHeight: number;
}

/**
 * The largest whole-pixel size in `[minSize, maxSize]` at which each word fits
 * on a line and greedy word-wrapping needs no more than `maxLines`. If nothing
 * fits — a word longer than the line even at `minSize` — returns `minSize`, and
 * the platform breaks that word as a last resort.
 */
export function fitTitleSize({
  title,
  width,
  maxSize,
  minSize,
  maxLines,
  lineHeightRatio = 1.2,
}: FitTitleOptions): FittedTitle {
  const words = title.split(/\s+/).filter(Boolean);
  const finish = (fontSize: number): FittedTitle => ({
    fontSize,
    lineHeight: Math.round(fontSize * lineHeightRatio),
  });
  if (words.length === 0) return finish(maxSize);

  for (let size = Math.floor(maxSize); size >= minSize; size -= 1) {
    if (fits(words, size, width, maxLines)) return finish(size);
  }
  return finish(minSize);
}

function fits(words: readonly string[], size: number, width: number, maxLines: number): boolean {
  const space = SPACE_EM * size * SAFETY;
  let lines = 1;
  let used = 0;
  for (const word of words) {
    const w = estimateTextWidth(word, size);
    if (w > width) return false;
    if (used === 0) {
      used = w;
    } else if (used + space + w <= width) {
      used += space + w;
    } else {
      lines += 1;
      used = w;
    }
    if (lines > maxLines) return false;
  }
  return true;
}
