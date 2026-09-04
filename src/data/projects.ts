import { useMemo } from "react";

import { useTable } from "@/data/store";
import { calculateProjectProgress, type ProjectProgress } from "@/domain/progress";
import { orderProjectItems } from "@/domain/projectOrder";
import type { Project, ProjectItem } from "@/domain/entities";

function bySortKey<T extends { manual_sort_key: string }>(a: T, b: T) {
  return a.manual_sort_key < b.manual_sort_key ? -1 : a.manual_sort_key > b.manual_sort_key ? 1 : 0;
}

export function useActiveProjects(): readonly Project[] {
  const projects = useTable("projects");
  return useMemo(
    () =>
      Object.values(projects)
        .filter((project) => !project.deleted_at && !project.archived_at)
        .sort(bySortKey),
    [projects],
  );
}

export function useArchivedProjects(): readonly Project[] {
  const projects = useTable("projects");
  return useMemo(
    () =>
      Object.values(projects)
        .filter((project) => !project.deleted_at && project.archived_at)
        .sort(bySortKey),
    [projects],
  );
}

export function useProject(id: string | undefined): Project | null {
  const projects = useTable("projects");
  return useMemo(() => (id ? (projects[id] ?? null) : null), [projects, id]);
}

/** Items of a project under one parent (null = top level), in display order. */
export function useProjectItems(
  projectId: string | undefined,
  parentId: string | null,
): readonly ProjectItem[] {
  const items = useTable("project_items");
  const projects = useTable("projects");

  return useMemo(() => {
    if (!projectId) return [];
    const project = projects[projectId];
    const scoped = Object.values(items).filter(
      (item) => item.project_id === projectId && item.parent_id === parentId && !item.deleted_at,
    );
    return orderProjectItems(scoped, project?.order_mode ?? "importance_default");
  }, [items, projects, projectId, parentId]);
}

/** All non-deleted items of a project (any depth) — for progress and totals. */
export function useAllProjectItems(projectId: string | undefined): readonly ProjectItem[] {
  const items = useTable("project_items");
  return useMemo(() => {
    if (!projectId) return [];
    return Object.values(items).filter(
      (item) => item.project_id === projectId && !item.deleted_at,
    );
  }, [items, projectId]);
}

export function useProjectProgress(project: Project | null): ProjectProgress {
  const items = useAllProjectItems(project?.id);
  return useMemo(() => {
    if (!project) {
      return { completed: 0, total: 0, ratio: 0, omittedEstimateCount: 0 };
    }
    return calculateProjectProgress(items, project.mode, project.progress_mode);
  }, [items, project]);
}

/** Children of a structured task (its subtasks). */
export function useSubtaskCount(projectId: string | undefined, taskId: string): number {
  const items = useTable("project_items");
  return useMemo(
    () =>
      Object.values(items).filter(
        (item) => item.project_id === projectId && item.parent_id === taskId && !item.deleted_at,
      ).length,
    [items, projectId, taskId],
  );
}
