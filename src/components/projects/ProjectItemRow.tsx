import { Pressable, StyleSheet, Text, View } from "react-native";

import { importanceColor, importanceLabel } from "@/components/projects/ImportancePicker";
import { PlatformIcon } from "@/components/ui/PlatformIcon";
import { projectItems } from "@/data/repositories";
import { formatDuration } from "@/domain/duration";
import type { ProjectItem } from "@/domain/entities";
import { colors, radius, spacing, typography } from "@/theme/tokens";

export const ROW_HEIGHT_COMPACT = 72;
export const ROW_HEIGHT_TABLE = 52;

export type ProjectItemRowProps = {
  item: ProjectItem;
  layout: "compact" | "table";
  onOpen: () => void;
  /** Structured tasks show how many subtasks they hold. */
  subtaskCount?: number;
};

export function ProjectItemRow({ item, layout, onOpen, subtaskCount }: ProjectItemRowProps) {
  const done = Boolean(item.completed_at);

  const circle = (
    <Pressable
      onPress={() => projectItems.setCompleted(item.id, !done)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={item.title}
      hitSlop={8}
    >
      <PlatformIcon
        sf={done ? "checkmark.circle.fill" : "circle"}
        ion={done ? "checkmark-circle" : "ellipse-outline"}
        size={22}
        color={done ? colors.text : colors.textSecondary}
      />
    </Pressable>
  );

  if (layout === "table") {
    return (
      <View style={[styles.tableRow, done && styles.done]}>
        {circle}
        <Pressable onPress={onOpen} style={styles.tableTap} accessibilityRole="button">
          <Text style={[styles.cellName, done && styles.strike]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.cell, { color: importanceColor(item.importance) }]}>
            {item.importance ? importanceLabel(item.importance) : "—"}
          </Text>
          <Text style={styles.cell}>
            {item.estimated_minutes ? formatDuration(item.estimated_minutes) : "—"}
          </Text>
          <Text style={[styles.cell, styles.cellWide]} numberOfLines={1}>
            {item.notes ?? ""}
          </Text>
          <Text style={styles.cell}>{item.scheduled_date ?? "—"}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.compactRow, done && styles.done]}>
      {circle}
      <Pressable onPress={onOpen} style={styles.compactBody} accessibilityRole="button">
        <Text style={[styles.name, done && styles.strike]} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          {item.importance ? (
            <Text style={[styles.meta, { color: importanceColor(item.importance) }]}>
              {importanceLabel(item.importance)}
            </Text>
          ) : null}
          {item.estimated_minutes ? (
            <Text style={styles.meta}>{formatDuration(item.estimated_minutes)}</Text>
          ) : null}
          {item.scheduled_date ? <Text style={styles.meta}>Scheduled</Text> : null}
          {subtaskCount !== undefined ? (
            <Text style={styles.meta}>
              {subtaskCount} subtask{subtaskCount === 1 ? "" : "s"}
            </Text>
          ) : null}
          {item.notes ? <Text style={styles.meta}>Notes</Text> : null}
        </View>
      </Pressable>
      <PlatformIcon sf="chevron.right" ion="chevron-forward" size={16} color={colors.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  done: {
    opacity: 0.55,
  },
  strike: {
    textDecorationLine: "line-through",
  },
  compactRow: {
    height: ROW_HEIGHT_COMPACT,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  compactBody: {
    flex: 1,
    gap: 2,
    justifyContent: "center",
    height: "100%",
  },
  tableTap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    height: "100%",
  },
  name: {
    ...typography.body,
    color: colors.text,
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  tableRow: {
    height: ROW_HEIGHT_TABLE,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  cellName: {
    ...typography.body,
    color: colors.text,
    flex: 2,
  },
  cell: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  cellWide: {
    flex: 2,
  },
});
