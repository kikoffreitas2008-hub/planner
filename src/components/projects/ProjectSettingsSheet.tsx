import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { projects } from "@/data/repositories";
import { offerUndo } from "@/data/undoBar";
import type { Project } from "@/domain/entities";
import { colors, radius, shadow, spacing, typography } from "@/theme/tokens";

export type ProjectSettingsSheetProps = {
  project: Project;
  onClose: () => void;
  onArchivedOrDeleted: () => void;
};

export function ProjectSettingsSheet({
  project,
  onClose,
  onArchivedOrDeleted,
}: ProjectSettingsSheetProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function archive() {
    projects.archive(project.id);
    onArchivedOrDeleted();
  }

  function deletePermanently() {
    projects.purge(project.id);
    offerUndo("Project deleted", () => {}, () => {});
    onArchivedOrDeleted();
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close" onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Project settings</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.body}>
            <Text style={styles.sectionLabel}>Progress</Text>
            <View style={styles.segment}>
              {(["items", "time"] as const).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => projects.update(project.id, { progress_mode: option })}
                  accessibilityRole="button"
                  accessibilityState={{ selected: project.progress_mode === option }}
                  style={[
                    styles.segmentButton,
                    project.progress_mode === option && styles.segmentButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      project.progress_mode === option && styles.segmentTextActive,
                    ]}
                  >
                    {option === "items" ? "By count" : "By time"}
                  </Text>
                </Pressable>
              ))}
            </View>

            {project.order_mode === "manual" ? (
              <Pressable
                onPress={() => projects.restoreImportanceOrder(project.id)}
                accessibilityRole="button"
                style={styles.action}
              >
                <Text style={styles.actionText}>Restore importance ordering</Text>
              </Pressable>
            ) : null}

            <Pressable onPress={archive} accessibilityRole="button" style={styles.action}>
              <Text style={styles.actionText}>Archive project</Text>
            </Pressable>

            {confirmingDelete ? (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmText}>
                  Delete “{project.title}” and all its items permanently?
                </Text>
                <View style={styles.confirmRow}>
                  <Pressable
                    onPress={deletePermanently}
                    accessibilityRole="button"
                    style={styles.confirmDelete}
                  >
                    <Text style={styles.confirmDeleteText}>Delete permanently</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setConfirmingDelete(false)}
                    accessibilityRole="button"
                    style={styles.action}
                  >
                    <Text style={styles.actionText}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => setConfirmingDelete(true)}
                accessibilityRole="button"
                style={styles.action}
              >
                <Text style={[styles.actionText, styles.danger]}>Delete permanently</Text>
              </Pressable>
            )}
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
    ...(Platform.OS === "web" ? { boxShadow: "0 -8px 26px rgba(0,0,0,0.16)" } : shadow.floating),
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
  segment: {
    flexDirection: "row",
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.medium,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: "center",
    borderRadius: radius.small,
  },
  segmentButtonActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.text,
  },
  action: {
    paddingVertical: spacing.sm,
  },
  actionText: {
    ...typography.body,
    color: colors.text,
  },
  danger: {
    color: "#662C2C",
  },
  confirmBox: {
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.medium,
    padding: spacing.md,
    gap: spacing.sm,
  },
  confirmText: {
    ...typography.body,
    color: colors.text,
  },
  confirmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  confirmDelete: {
    backgroundColor: "#662C2C",
    borderRadius: radius.medium,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  confirmDeleteText: {
    ...typography.button,
    color: colors.surface,
  },
});
