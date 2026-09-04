import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";

import { GlossyCard } from "@/components/ui/GlossyCard";
import { projectItems } from "@/data/repositories";
import { useTable } from "@/data/store";
import type { Project, ProjectItem } from "@/domain/entities";
import { colors, layoutTokens, palette, radius, spacing, typography } from "@/theme/tokens";

const GAP = spacing.md;
const TARGET_CARD = 150;

export type StructuredTaskGridProps = {
  project: Project;
  tasks: readonly ProjectItem[];
  onOpenTask: (taskId: string) => void;
};

/**
 * A structured project opens to a grid of task cards in the same visual
 * language at a smaller scale (blueprint/01 §4.2).
 */
export function StructuredTaskGrid({ project, tasks, onOpenTask }: StructuredTaskGridProps) {
  const { width } = useWindowDimensions();
  const allItems = useTable("project_items");
  const [draft, setDraft] = useState("");

  const containerWidth = Math.min(
    width - layoutTokens.horizontalPadding * 2,
    layoutTokens.contentMaxWidth,
  );
  const columns = Math.max(2, Math.floor((containerWidth + GAP) / (TARGET_CARD + GAP)));
  const size = (containerWidth - GAP * (columns - 1)) / columns;
  const ink = palette[project.color].ink;

  function subtaskCount(taskId: string): number {
    return Object.values(allItems).filter(
      (item) => item.parent_id === taskId && !item.deleted_at,
    ).length;
  }

  function addTask() {
    const title = draft.trim();
    if (!title) return;
    projectItems.create(project.id, null, { title });
    setDraft("");
  }

  return (
    <View style={styles.wrap}>
      {tasks.length === 0 ? (
        <Text style={styles.empty}>No tasks yet.</Text>
      ) : (
        <View style={styles.grid}>
          {tasks.map((task) => {
            const count = subtaskCount(task.id);
            const done = Boolean(task.completed_at);
            return (
              <Pressable
                key={task.id}
                onPress={() => onOpenTask(task.id)}
                accessibilityRole="button"
                accessibilityLabel={task.title}
                style={done && styles.done}
              >
                <GlossyCard color={project.color} style={{ width: size, height: size }}>
                  <View style={styles.taskBody}>
                    <Text style={[styles.taskTitle, { color: ink }]} numberOfLines={3}>
                      {task.title}
                    </Text>
                    <Text style={[styles.taskSubtitle, { color: ink }]}>
                      {count} subtask{count === 1 ? "" : "s"}
                    </Text>
                  </View>
                </GlossyCard>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.addRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={addTask}
          submitBehavior="submit"
          returnKeyType="done"
          placeholder="Add a task"
          placeholderTextColor={colors.textSecondary}
          style={styles.addInput}
        />
        {draft.trim() ? (
          <Pressable onPress={addTask} accessibilityRole="button" style={styles.addButton}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.lg,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },
  done: {
    opacity: 0.6,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
    paddingVertical: spacing.md,
  },
  taskBody: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs,
  },
  taskTitle: {
    ...typography.heading,
    textAlign: "center",
  },
  taskSubtitle: {
    ...typography.caption,
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
});
