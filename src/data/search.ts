import { useMemo } from "react";
import MiniSearch from "minisearch";

import { getDatabase, useTable } from "@/data/store";
import type { ISODate } from "@/domain/date";

export type SearchResultKind = "todo" | "event" | "project" | "project_item" | "remember";

export interface SearchDoc {
  id: string;
  kind: SearchResultKind;
  title: string;
  text: string;
  date?: ISODate;
  projectId?: string;
  taskId?: string;
}

export interface SearchResult extends SearchDoc {
  score: number;
}

function activeEntries<T extends { deleted_at: string | null }>(
  table: Record<string, T>,
): T[] {
  return Object.values(table).filter((row) => !row.deleted_at);
}

function buildDocs(): SearchDoc[] {
  const db = getDatabase();
  const docs: SearchDoc[] = [];

  for (const item of activeEntries(db.calendar_items)) {
    docs.push({
      id: `calendar:${item.id}`,
      kind: item.item_type === "event" ? "event" : "todo",
      title: item.title,
      text: [item.notes, item.item_type === "event" ? item.location : null].filter(Boolean).join(" "),
      date: item.date,
    });
  }

  for (const project of activeEntries(db.projects)) {
    if (project.archived_at) continue;
    docs.push({ id: `project:${project.id}`, kind: "project", title: project.title, text: "", projectId: project.id });
  }

  for (const item of activeEntries(db.project_items)) {
    const project = db.projects[item.project_id];
    docs.push({
      id: `project_item:${item.id}`,
      kind: "project_item",
      title: item.title,
      text: [item.notes, project?.title].filter((value): value is string => Boolean(value)).join(" "),
      projectId: item.project_id,
      taskId: item.parent_id ?? undefined,
    });
  }

  for (const item of activeEntries(db.remember_items)) {
    docs.push({ id: `remember:${item.id}`, kind: "remember", title: item.title, text: "", date: item.date });
  }

  return docs;
}

/** A fresh local index — cheap enough to rebuild on every relevant change. */
export function buildSearchIndex(): MiniSearch<SearchDoc> {
  const index = new MiniSearch<SearchDoc>({
    idField: "id",
    fields: ["title", "text"],
    storeFields: ["kind", "title", "date", "projectId", "taskId"],
    searchOptions: { prefix: true, fuzzy: 0.2, boost: { title: 2 } },
  });
  index.addAll(buildDocs());
  return index;
}

/** Rebuilds only when a searchable table actually changes. */
export function useSearchIndex(): MiniSearch<SearchDoc> {
  const calendarItems = useTable("calendar_items");
  const projects = useTable("projects");
  const projectItems = useTable("project_items");
  const rememberItems = useTable("remember_items");

  // buildSearchIndex() re-reads the whole store itself; these four table
  // objects are only here as invalidation triggers (their identity changes
  // exactly when that table is written — see data/store.ts).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => buildSearchIndex(), [calendarItems, projects, projectItems, rememberItems]);
}

export function search(index: MiniSearch<SearchDoc>, query: string): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];
  return index.search(trimmed).slice(0, 30) as unknown as SearchResult[];
}
