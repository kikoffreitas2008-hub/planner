import { generateKeyBetween } from "fractional-indexing";

import type { ProjectItem } from "./entities";

export type ProjectOrderMode = "importance_default" | "manual";

const importanceRank: Record<NonNullable<ProjectItem["importance"]>, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function stableFallback(left: ProjectItem, right: ProjectItem): number {
  return (
    left.created_at.localeCompare(right.created_at) ||
    left.id.localeCompare(right.id)
  );
}

export function orderProjectItems(
  items: readonly ProjectItem[],
  mode: ProjectOrderMode,
): readonly ProjectItem[] {
  return [...items].sort((left, right) => {
    if (mode === "manual") {
      const keyOrder =
        left.manual_sort_key < right.manual_sort_key
          ? -1
          : left.manual_sort_key > right.manual_sort_key
            ? 1
            : 0;
      return keyOrder || stableFallback(left, right);
    }

    const leftRank = left.importance ? importanceRank[left.importance] : 3;
    const rightRank = right.importance ? importanceRank[right.importance] : 3;
    return leftRank - rightRank || stableFallback(left, right);
  });
}

export function manualSortKeyBetween(
  beforeKey: string | null,
  afterKey: string | null,
): string {
  return generateKeyBetween(beforeKey, afterKey);
}
