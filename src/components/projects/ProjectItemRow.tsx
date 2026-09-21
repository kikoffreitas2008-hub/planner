import { StyleSheet, Text, View } from "react-native";

import { importanceColor, importanceLabel } from "@/components/projects/ImportancePicker";
import { PlatformIcon } from "@/components/ui/PlatformIcon";
import { Touchable } from "@/components/ui/Touchable";
import { projectItems } from "@/data/repositories";
import { formatDuration } from "@/domain/duration";
import type { ProjectItem } from "@/domain/entities";
import { colors, radius, spacing, typography } from "@/theme/tokens";

export const ROW_HEIGHT = 72;

export type ProjectItemRowProps = {
  item: ProjectItem;
  onOpen: () => void;
};

/** One row, identical on every screen size — the phone layout is the layout. */
export function ProjectItemRow({ item, onOpen }: ProjectItemRowProps) {
  const done = Boolean(item.completed_at);

  return (
    <View style={[styles.row, done && styles.done]}>
      <Touchable
        variant="control"
        haptic="selection"
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
      </Touchable>

      <Touchable variant="row" onPress={onOpen} style={styles.body}>
        <Text style={[styles.name, done && styles.strike]} numberOfLines={1}>
          {item.title}
        </Text>
        <View style={styles.metaRow}>
          {item.importance ? (
            <Text style={[styles.meta, { color: importanceColor(item.importance) }]}>
              {importanceLabel(item.importance)}
            </Text>
          ) : null}
          {item.scheduled_date ? <Text style={styles.meta}>Scheduled</Text> : null}
          {item.notes ? <Text style={styles.meta}>Notes</Text> : null}
        </View>
      </Touchable>

      {item.estimated_minutes ? (
        <Text style={styles.estimate}>{formatDuration(item.estimated_minutes)}</Text>
      ) : null}
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
  row: {
    height: ROW_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  body: {
    flex: 1,
    gap: 2,
    justifyContent: "center",
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
  estimate: {
    ...typography.caption,
    color: colors.text,
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    overflow: "hidden",
  },
});
