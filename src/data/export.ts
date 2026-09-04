import JSZip from "jszip";

import { getDatabase } from "@/data/store";
import { toCsv } from "@/lib/csv";
import { todayInLisbon } from "@/lib/today";

function activeRows<T extends { deleted_at: string | null }>(table: Record<string, T>): T[] {
  return Object.values(table).filter((row) => !row.deleted_at);
}

/**
 * One complete JSON file plus CSVs for agenda, projects and routines
 * (blueprint/01 §7). Web builds a Blob directly; a native build gets this
 * through expo-file-system + expo-sharing once one exists.
 */
export async function buildExportZip(): Promise<Blob> {
  const db = getDatabase();
  const zip = new JSZip();

  zip.file("planner-data.json", JSON.stringify(db, null, 2));

  const agendaRows = activeRows(db.calendar_items).map((item) => ({
    type: item.item_type,
    title: item.title,
    date: item.date,
    starts_at: item.starts_at ?? "",
    ends_at: item.ends_at ?? "",
    all_day: item.all_day ? "yes" : "no",
    completed: item.completed_at ? "yes" : "no",
    color: item.color,
    location: item.item_type === "event" ? (item.location ?? "") : "",
    notes: item.notes ?? "",
    repeats: item.recurrence_rule ? "yes" : "no",
  }));
  zip.file(
    "agenda.csv",
    toCsv(agendaRows, [
      "type",
      "title",
      "date",
      "starts_at",
      "ends_at",
      "all_day",
      "completed",
      "color",
      "location",
      "notes",
      "repeats",
    ]),
  );

  const projectTitleById = new Map(activeRows(db.projects).map((project) => [project.id, project.title]));
  const projectRows = activeRows(db.project_items).map((item) => ({
    project: projectTitleById.get(item.project_id) ?? "",
    title: item.title,
    importance: item.importance ?? "",
    estimated_minutes: item.estimated_minutes ?? "",
    completed: item.completed_at ? "yes" : "no",
    scheduled_date: item.scheduled_date ?? "",
    notes: item.notes ?? "",
  }));
  zip.file(
    "projects.csv",
    toCsv(projectRows, [
      "project",
      "title",
      "importance",
      "estimated_minutes",
      "completed",
      "scheduled_date",
      "notes",
    ]),
  );

  const listTitleById = new Map(activeRows(db.routine_lists).map((list) => [list.id, list.title]));
  const routineRows = activeRows(db.routine_items).map((item) => ({
    list: listTitleById.get(item.routine_list_id) ?? "",
    title: item.title,
    checked: item.completed_at ? "yes" : "no",
  }));
  zip.file("routines.csv", toCsv(routineRows, ["list", "title", "checked"]));

  return zip.generateAsync({ type: "blob" });
}

/** Web only for now: builds the zip and triggers a normal browser download. */
export async function exportAndDownloadWeb(): Promise<void> {
  const blob = await buildExportZip();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `planner-export-${todayInLisbon()}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
