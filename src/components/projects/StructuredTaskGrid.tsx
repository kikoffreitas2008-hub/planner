import { useState } from "react";
import { StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";

import { ProgressBar } from "@/components/projects/ProgressBar";
import { useProgressVisible } from "@/components/projects/ProgressToggle";
import { GlossyCard } from "@/components/ui/GlossyCard";
import { Touchable } from "@/components/ui/Touchable";
import { useTaskProgress } from "@/data/projects";
import { projectItems } from "@/data/repositories";
import type { Project, ProjectItem } from "@/domain/entities";
import { fitTitleSize, MIN_TITLE_SIZE } from "@/domain/fitText";
import { colors, layoutTokens, palette, radius, spacing, typography } from "@/theme/tokens";

const GAP = spacing.md;
const TARGET_CARD = 150;
const TITLE_LINES = 4;
/** The progress bar takes the room of one line of the name. */
const TITLE_LINES_WITH_PROGRESS = 3;
/** Centred text may run this far into the card's padding on each side. */
const TITLE_BLEED = spacing.xs;

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
  const [draft, setDraft] = useState("");
  const showProgress = useProgressVisible();

  const containerWidth = Math.min(
    width - layoutTokens.horizontalPadding * 2,
    layoutTokens.contentMaxWidth,
  );
  const columns = Math.max(2, Math.floor((containerWidth + GAP) / (TARGET_CARD + GAP)));
  const size = (containerWidth - GAP * (columns - 1)) / columns;
  const lineWidth = size - spacing.lg * 2 + TITLE_BLEED * 2;

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
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              project={project}
              task={task}
              size={size}
              lineWidth={lineWidth}
              showProgress={showProgress}
              onPress={() => onOpenTask(task.id)}
            />
          ))}
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
          <Touchable onPress={addTask} haptic="success" style={styles.addButton}>
            <Text style={styles.addButtonText}>Add</Text>
          </Touchable>
        ) : null}
      </View>
    </View>
  );
}

function TaskCard({
  project,
  task,
  size,
  lineWidth,
  showProgress,
  onPress,
}: {
  project: Project;
  task: ProjectItem;
  size: number;
  lineWidth: number;
  showProgress: boolean;
  onPress: () => void;
}) {
  const progress = useTaskProgress(project, task.id);
  const done = Boolean(task.completed_at);
  const color = task.color ?? project.color;
  const ink = palette[color].ink;
  // Size the name to the card so no word is broken across lines.
  const fitted = fitTitleSize({
    title: task.title,
    width: lineWidth,
    maxSize: typography.heading.fontSize,
    minSize: MIN_TITLE_SIZE,
    maxLines: showProgress ? TITLE_LINES_WITH_PROGRESS : TITLE_LINES,
    lineHeightRatio: typography.heading.lineHeight / typography.heading.fontSize,
  });

  return (
    <Touchable
      variant="card"
      onPress={onPress}
      accessibilityLabel={task.title}
      style={done ? styles.done : undefined}
    >
      <GlossyCard color={color} style={{ width: size, height: size }}>
        <View style={[styles.taskBody, showProgress && styles.taskBodyWithProgress]}>
          {/* Width on a View: a numberOfLines Text on web is capped at its
              parent's width, which would cancel the bleed. */}
          <View style={[{ width: lineWidth }, showProgress && styles.titleArea]}>
            <Text
              style={[styles.taskTitle, fitted, { color: ink }]}
              numberOfLines={showProgress ? TITLE_LINES_WITH_PROGRESS : TITLE_LINES}
            >
              {task.title}
            </Text>
          </View>
          {showProgress ? (
            <ProgressBar progress={progress} mode={project.progress_mode} tone="ink" inkColor={ink} />
          ) : null}
        </View>
      </GlossyCard>
    </Touchable>
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
  },
  taskBodyWithProgress: {
    gap: spacing.xs,
  },
  titleArea: {
    flex: 1,
    justifyContent: "center",
  },
  taskTitle: {
    ...typography.heading,
    textAlign: "center",
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
