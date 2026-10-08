import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { CompletedItemDialog } from "@/components/projects/CompletedItemDialog";
import { DraggableColumn } from "@/components/projects/DraggableColumn";
import { ProjectItemRow, ROW_HEIGHT } from "@/components/projects/ProjectItemRow";
import { ProjectItemSheet } from "@/components/projects/ProjectItemSheet";
import { Touchable } from "@/components/ui/Touchable";
import { useArchivedProjectItems } from "@/data/projects";
import { projectItems, projects } from "@/data/repositories";
import { offerUndo } from "@/data/undoBar";
import { formatDuration, totalEstimatedMinutes } from "@/domain/duration";
import type { Project, ProjectItem } from "@/domain/entities";
import { colors, radius, spacing, typography } from "@/theme/tokens";

const ROW_GAP = spacing.xs;
/** How long a just-checked item shows struck through before the archive/delete question. */
const ASK_AFTER_MS = 500;

export type ProjectItemListProps = {
  project: Project;
  parentId: string | null;
  items: readonly ProjectItem[];
  /** Tapping a row opens this instead of the edit sheet (structured tasks). */
  onOpenItem?: (item: ProjectItem) => void;
};

/** The same list on the phone and on the desktop — there is no wide variant. */
export function ProjectItemList({ project, parentId, items, onOpenItem }: ProjectItemListProps) {
  const estimatedRowHeight = ROW_HEIGHT + ROW_GAP;

  const [draft, setDraft] = useState("");
  const [sheetItem, setSheetItem] = useState<ProjectItem | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [askFor, setAskFor] = useState<ProjectItem | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const askTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const archived = useArchivedProjectItems(project.id, parentId);

  useEffect(() => () => {
    if (askTimer.current) clearTimeout(askTimer.current);
  }, []);

  function toggleComplete(item: ProjectItem) {
    if (askTimer.current) clearTimeout(askTimer.current);
    askTimer.current = null;
    if (item.completed_at) {
      projectItems.setCompleted(item.id, false);
      return;
    }
    // Let the strike-through land before asking what to do with it.
    projectItems.setCompleted(item.id, true);
    askTimer.current = setTimeout(() => {
      askTimer.current = null;
      setAskFor(item);
    }, ASK_AFTER_MS);
  }

  function archiveItem(item: ProjectItem) {
    projectItems.archive(item.id);
    setAskFor(null);
    offerUndo("Item archived", () => projectItems.unarchive(item.id), () => {});
  }

  function deleteItem(item: ProjectItem) {
    projectItems.softDelete(item.id);
    setAskFor(null);
    offerUndo("Item deleted", () => projectItems.restore(item.id), () => projectItems.purge(item.id));
  }

  function addItem() {
    const title = draft.trim();
    if (!title) return;
    projectItems.create(project.id, parentId, { title });
    setDraft("");
  }

  function openItem(item: ProjectItem) {
    if (onOpenItem) onOpenItem(item);
    else setSheetItem(item);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.count}>
          {items.length} item{items.length === 1 ? "" : "s"}
        </Text>
        <View style={styles.headerControls}>
          {project.order_mode === "manual" ? (
            <Touchable onPress={() => projects.restoreImportanceOrder(project.id)}>
              <Text style={styles.link}>Sort by importance</Text>
            </Touchable>
          ) : null}
          {items.length > 1 ? (
            <Touchable
              onPress={() => setEditMode((on) => !on)}
              accessibilityState={{ selected: editMode }}
            >
              <Text style={styles.link}>{editMode ? "Done" : "Edit"}</Text>
            </Touchable>
          ) : null}
        </View>
      </View>

      {items.length === 0 ? (
        <Text style={styles.empty}>No items yet.</Text>
      ) : (
        <DraggableColumn
          data={items}
          enabled={editMode}
          estimatedRowHeight={estimatedRowHeight}
          onReorder={(orderedIds) => projectItems.applyOrder(project.id, orderedIds)}
          renderItem={(item) => (
            <View style={{ paddingBottom: ROW_GAP }}>
              <ProjectItemRow
                item={item}
                onOpen={() => openItem(item)}
                onToggleComplete={() => toggleComplete(item)}
              />
            </View>
          )}
        />
      )}

      <View style={styles.addRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={addItem}
          submitBehavior="submit"
          returnKeyType="done"
          placeholder="Add an item"
          placeholderTextColor={colors.textSecondary}
          style={styles.addInput}
        />
        {draft.trim() ? (
          <Touchable onPress={addItem} haptic="success" style={styles.addButton}>
            <Text style={styles.addButtonText}>Add</Text>
          </Touchable>
        ) : null}
      </View>

      <Text style={styles.total}>
        Total estimated time: {formatDuration(totalEstimatedMinutes(items)) || "0 min"}
      </Text>

      {archived.length ? (
        <View style={styles.archived}>
          <Touchable
            variant="row"
            onPress={() => setArchivedOpen((open) => !open)}
            accessibilityState={{ expanded: archivedOpen }}
          >
            <Text style={styles.link}>
              {archivedOpen ? "Hide archived" : `Archived (${archived.length})`}
            </Text>
          </Touchable>
          {archivedOpen
            ? archived.map((item) => (
                <View key={item.id} style={styles.archivedRow}>
                  <Text style={styles.archivedTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Touchable onPress={() => projectItems.unarchive(item.id)}>
                    <Text style={styles.link}>Restore</Text>
                  </Touchable>
                  <Touchable onPress={() => deleteItem(item)} haptic="warning">
                    <Text style={[styles.link, styles.danger]}>Delete</Text>
                  </Touchable>
                </View>
              ))
            : null}
        </View>
      ) : null}

      {askFor ? (
        <CompletedItemDialog
          title={askFor.title}
          onArchive={() => archiveItem(askFor)}
          onDelete={() => deleteItem(askFor)}
          onKeep={() => setAskFor(null)}
        />
      ) : null}

      {sheetItem ? (
        <ProjectItemSheet
          item={sheetItem}
          onClose={() => setSheetItem(null)}
          onToggleComplete={() => {
            toggleComplete(sheetItem);
            setSheetItem(null);
          }}
        />
      ) : null}
    </View>
  );
}


const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  count: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  headerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  link: {
    ...typography.button,
    color: colors.text,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    paddingVertical: spacing.md,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  addInput: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.medium,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  addButton: {
    backgroundColor: colors.text,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  addButtonText: {
    ...typography.button,
    color: colors.surface,
  },
  archived: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  archivedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxs,
  },
  archivedTitle: {
    ...typography.body,
    color: colors.textSecondary,
    textDecorationLine: "line-through",
    flex: 1,
  },
  danger: {
    color: "#662C2C",
  },
  total: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
