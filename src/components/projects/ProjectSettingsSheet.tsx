import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { ColorSwatches } from "@/components/ui/ColorSwatches";
import { Touchable } from "@/components/ui/Touchable";
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
            <Touchable onPress={onClose} accessibilityLabel="Close">
              <Text style={styles.close}>✕</Text>
            </Touchable>
          </View>

          <View style={styles.body}>
            <Text style={styles.sectionLabel}>Colour</Text>
            <ColorSwatches
              value={project.color}
              onChange={(color) => projects.update(project.id, { color })}
            />

            <Text style={styles.sectionLabel}>Progress</Text>
            <View style={styles.segment}>
              {(["items", "time"] as const).map((option) => (
                <Touchable
                  key={option}
                  haptic="selection"
                  onPress={() => projects.update(project.id, { progress_mode: option })}
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
                </Touchable>
              ))}
            </View>

            {project.order_mode === "manual" ? (
              <Touchable
                variant="row"
                onPress={() => projects.restoreImportanceOrder(project.id)}
                style={styles.action}
              >
                <Text style={styles.actionText}>Restore importance ordering</Text>
              </Touchable>
            ) : null}

            <Touchable variant="row" onPress={archive} style={styles.action}>
              <Text style={styles.actionText}>Archive project</Text>
            </Touchable>

            {confirmingDelete ? (
              <View style={styles.confirmBox}>
                <Text style={styles.confirmText}>
                  Delete “{project.title}” and all its items permanently?
                </Text>
                <View style={styles.confirmRow}>
                  <Touchable
                    onPress={deletePermanently}
                    haptic="warning"
                    style={styles.confirmDelete}
                  >
                    <Text style={styles.confirmDeleteText}>Delete permanently</Text>
                  </Touchable>
                  <Touchable
                    variant="row"
                    onPress={() => setConfirmingDelete(false)}
                    style={styles.action}
                  >
                    <Text style={styles.actionText}>Cancel</Text>
                  </Touchable>
                </View>
              </View>
            ) : (
              <Touchable
                variant="row"
                onPress={() => setConfirmingDelete(true)}
                style={styles.action}
              >
                <Text style={[styles.actionText, styles.danger]}>Delete permanently</Text>
              </Touchable>
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
