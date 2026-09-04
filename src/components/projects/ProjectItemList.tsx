import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";

import { DraggableColumn } from "@/components/projects/DraggableColumn";
import {
  ProjectItemRow,
  ROW_HEIGHT_COMPACT,
  ROW_HEIGHT_TABLE,
} from "@/components/projects/ProjectItemRow";
import { ProjectItemSheet } from "@/components/projects/ProjectItemSheet";
import { projectItems, projects } from "@/data/repositories";
import { formatDuration, totalEstimatedMinutes } from "@/domain/duration";
import type { Project, ProjectItem } from "@/domain/entities";
import { colors, radius, spacing, typography } from "@/theme/tokens";

const ROW_GAP = spacing.xs;

export type ProjectItemListProps = {
  project: Project;
  parentId: string | null;
  items: readonly ProjectItem[];
  /** Tapping a row opens this instead of the edit sheet (structured tasks). */
  onOpenItem?: (item: ProjectItem) => void;
  subtaskCounts?: Record<string, number>;
};

export function ProjectItemList({
  project,
  parentId,
  items,
  onOpenItem,
  subtaskCounts,
}: ProjectItemListProps) {
  const { width } = useWindowDimensions();
  const table = width >= 720;
  const rowHeight = (table ? ROW_HEIGHT_TABLE : ROW_HEIGHT_COMPACT) + ROW_GAP;

  const [draft, setDraft] = useState("");
  const [sheetItem, setSheetItem] = useState<ProjectItem | null>(null);

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
        {project.order_mode === "manual" ? (
          <Pressable
            onPress={() => projects.restoreImportanceOrder(project.id)}
            accessibilityRole="button"
          >
            <Text style={styles.link}>Sort by importance</Text>
          </Pressable>
        ) : (
          <Text style={styles.hint}>Long-press a row to reorder</Text>
        )}
      </View>

      {table ? <TableHead /> : null}

      {items.length === 0 ? (
        <Text style={styles.empty}>No items yet.</Text>
      ) : (
        <DraggableColumn
          data={items}
          rowHeight={rowHeight}
          onReorder={(orderedIds) => projectItems.applyOrder(project.id, orderedIds)}
          renderItem={(item) => (
            <View style={{ paddingBottom: ROW_GAP }}>
              <ProjectItemRow
                item={item}
                layout={table ? "table" : "compact"}
                onOpen={() => openItem(item)}
                subtaskCount={subtaskCounts?.[item.id]}
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
          <Pressable onPress={addItem} accessibilityRole="button" style={styles.addButton}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.total}>
        Total estimated time: {formatDuration(totalEstimatedMinutes(items)) || "0 min"}
      </Text>

      {sheetItem ? (
        <ProjectItemSheet item={sheetItem} onClose={() => setSheetItem(null)} />
      ) : null}
    </View>
  );
}

function TableHead() {
  return (
    <View style={styles.tableHead}>
      <View style={{ width: 22 }} />
      <Text style={[styles.th, { flex: 2 }]}>Name</Text>
      <Text style={[styles.th, { flex: 1 }]}>Importance</Text>
      <Text style={[styles.th, { flex: 1 }]}>Time</Text>
      <Text style={[styles.th, { flex: 2 }]}>Notes</Text>
      <Text style={[styles.th, { flex: 1 }]}>Schedule</Text>
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
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
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
  tableHead: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xxs,
    borderBottomWidth: 1,
    borderBottomColor: colors.text,
  },
  th: {
    ...typography.caption,
    color: colors.text,
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
  total: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
