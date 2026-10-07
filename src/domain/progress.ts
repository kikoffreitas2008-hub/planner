import type { Project, ProjectItem } from "./entities.ts";

export interface ProjectProgress {
  completed: number;
  total: number;
  ratio: number;
  omittedEstimateCount: number;
}

export function eligibleProgressItems(
  items: readonly ProjectItem[],
  projectMode: Project["mode"],
): readonly ProjectItem[] {
  const active = items.filter((item) => item.deleted_at === null);
  if (projectMode === "simple") {
    return active.filter((item) => item.parent_id === null);
  }

  const parentIds = new Set(
    active.flatMap((item) => (item.parent_id ? [item.parent_id] : [])),
  );
  return active.filter(
    (item) => item.parent_id !== null || !parentIds.has(item.id),
  );
}

export function calculateProjectProgress(
  items: readonly ProjectItem[],
  projectMode: Project["mode"],
  progressMode: Project["progress_mode"],
): ProjectProgress {
  const eligible = eligibleProgressItems(items, projectMode);

  if (progressMode === "items") {
    const completed = eligible.filter(
      (item) => item.completed_at !== null,
    ).length;
    const total = eligible.length;
    return {
      completed,
      total,
      ratio: total === 0 ? 0 : completed / total,
      omittedEstimateCount: 0,
    };
  }

  const estimated = eligible.filter((item) => item.estimated_minutes !== null);
  const total = estimated.reduce(
    (sum, item) => sum + (item.estimated_minutes ?? 0),
    0,
  );
  const completed = estimated.reduce(
    (sum, item) =>
      item.completed_at === null ? sum : sum + (item.estimated_minutes ?? 0),
    0,
  );
  return {
    completed,
    total,
    ratio: total === 0 ? 0 : completed / total,
    omittedEstimateCount: eligible.length - estimated.length,
  };
}

/**
 * Progress of one structured task: its subtasks, or the task itself while it
 * has none — the same leaf rule the project total uses.
 */
export function calculateTaskProgress(
  items: readonly ProjectItem[],
  taskId: string,
  progressMode: Project["progress_mode"],
): ProjectProgress {
  const own = items.filter((item) => item.id === taskId || item.parent_id === taskId);
  return calculateProjectProgress(own, "structured", progressMode);
}
