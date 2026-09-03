import type { ProjectItem } from "./entities";

export const MAX_PROJECT_DURATION_MINUTES = 7 * 24 * 60;

function invalidDuration(): never {
  throw new Error("Invalid duration.");
}

export function parseDuration(input: string): number | null {
  const normalized = input.trim().toLocaleLowerCase("pt-PT");
  if (!normalized) return null;

  let minutes: number | null = null;
  let match: RegExpMatchArray | null;

  if (/^\d+$/.test(normalized)) {
    minutes = Number(normalized);
  } else if ((match = normalized.match(/^(\d+)\s*min$/))) {
    minutes = Number(match[1]);
  } else if (
    (match = normalized.match(/^(\d+)\s*h(?:\s*(\d+)(?:\s*min)?)?$/))
  ) {
    const hourMinutes = Number(match[1]) * 60;
    const remainder = match[2] ? Number(match[2]) : 0;
    if (remainder >= 60) invalidDuration();
    minutes = hourMinutes + remainder;
  } else if ((match = normalized.match(/^(\d+):(\d{2})$/))) {
    const remainder = Number(match[2]);
    if (remainder >= 60) invalidDuration();
    minutes = Number(match[1]) * 60 + remainder;
  }

  if (
    minutes === null ||
    !Number.isSafeInteger(minutes) ||
    minutes < 0 ||
    minutes > MAX_PROJECT_DURATION_MINUTES
  ) {
    invalidDuration();
  }
  return minutes;
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null) return "";
  if (!Number.isSafeInteger(minutes) || minutes < 0) invalidDuration();

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours} h`;
  return `${hours} h ${remainder} min`;
}

export function totalEstimatedMinutes(items: readonly ProjectItem[]): number {
  return items.reduce(
    (total, item) => total + (item.estimated_minutes ?? 0),
    0,
  );
}
