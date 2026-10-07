import { useMemo } from "react";

import { useTable } from "@/data/store";
import {
  calculateProjectProgress,
  calculateTaskProgress,
  type ProjectProgress,
} from "@/domain/progress";
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

/** Items of a project under one parent (null = top level), in display order.
 * Archived items are left out; see useArchivedProjectItems. */
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
      (item) =>
        item.project_id === projectId &&
        item.parent_id === parentId &&
        !item.deleted_at &&
        !item.archived_at,
    );
    return orderProjectItems(scoped, project?.order_mode ?? "importance_default");
  }, [items, projects, projectId, parentId]);
}

/** Archived items under one parent, most recently archived first. */
export function useArchivedProjectItems(
  projectId: string | undefined,
  parentId: string | null,
): readonly ProjectItem[] {
  const items = useTable("project_items");
  return useMemo(() => {
    if (!projectId) return [];
    return Object.values(items)
      .filter(
        (item) =>
          item.project_id === projectId &&
          item.parent_id === parentId &&
          !item.deleted_at &&
          item.archived_at,
      )
      .sort((a, b) => (b.archived_at ?? "").localeCompare(a.archived_at ?? ""));
  }, [items, projectId, parentId]);
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

/** Progress of one structured task, by its project's progress mode. */
export function useTaskProgress(project: Project, taskId: string): ProjectProgress {
  const items = useAllProjectItems(project.id);
  return useMemo(
    () => calculateTaskProgress(items, taskId, project.progress_mode),
    [items, taskId, project.progress_mode],
  );
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
