import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ColorSwatches } from "@/components/ui/ColorSwatches";
import { CompleteButton } from "@/components/ui/CompleteButton";
import { Touchable } from "@/components/ui/Touchable";
import { projectItems } from "@/data/repositories";
import { offerUndo } from "@/data/undoBar";
import type { Project, ProjectItem } from "@/domain/entities";
import { colors, radius, shadow, spacing, typography } from "@/theme/tokens";

export type TaskSettingsSheetProps = {
  project: Project;
  task: ProjectItem;
  onClose: () => void;
  onDeleted: () => void;
};

/** Name, colour, completion and deletion of one structured task. */
export function TaskSettingsSheet({
  project,
  task,
  onClose,
  onDeleted,
}: TaskSettingsSheetProps) {
  const [title, setTitle] = useState(task.title);

  /** Rename on blur, submit or close; an empty name keeps the old one. */
  function commitTitle() {
    const next = title.trim();
    if (!next) setTitle(task.title);
    else if (next !== task.title) projectItems.update(task.id, { title: next });
  }

  function close() {
    commitTitle();
    onClose();
  }

  function remove() {
    const id = task.id;
    projectItems.softDelete(id);
    offerUndo(
      "Task deleted",
      () => projectItems.restore(id),
      () => projectItems.purge(id),
    );
    onDeleted();
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Close"
          onPress={close}
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Task</Text>
            <Touchable onPress={close} accessibilityLabel="Close">
              <Text style={styles.close}>✕</Text>
            </Touchable>
          </View>

          <View style={styles.body}>
            <Text style={styles.sectionLabel}>Name</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              onBlur={commitTitle}
              onSubmitEditing={commitTitle}
              returnKeyType="done"
              accessibilityLabel="Task name"
              placeholder="Task name"
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />

            <Text style={styles.sectionLabel}>Colour</Text>
            <ColorSwatches
              value={task.color ?? project.color}
              onChange={(color) => projectItems.update(task.id, { color })}
            />

            <CompleteButton
              done={Boolean(task.completed_at)}
              onPress={() =>
                projectItems.setCompleted(task.id, !task.completed_at)
              }
            />

            <Touchable
              variant="row"
              onPress={remove}
              haptic="warning"
              style={styles.action}
            >
              <Text style={[styles.actionText, styles.danger]}>
                Delete task and its subtasks
              </Text>
            </Touchable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.32)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
    paddingBottom: spacing.xl,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 -8px 26px rgba(0,0,0,0.16)" }
      : shadow.floating),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  close: {
    ...typography.heading,
    color: colors.textSecondary,
  },
  body: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  input: {
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.medium,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  action: {
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  actionText: {
    ...typography.body,
    color: colors.text,
  },
  danger: {
    color: "#662C2C",
  },
});
