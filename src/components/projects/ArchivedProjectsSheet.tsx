import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { ColorDot } from "@/components/ui/ColorDot";
import { Touchable } from "@/components/ui/Touchable";
import { useArchivedProjects } from "@/data/projects";
import { projects } from "@/data/repositories";
import { offerUndo } from "@/data/undoBar";
import { colors, radius, shadow, spacing, typography } from "@/theme/tokens";

export function ArchivedProjectsSheet({ onClose }: { onClose: () => void }) {
  const archived = useArchivedProjects();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function deletePermanently(id: string) {
    setConfirmingId(null);
    projects.softDelete(id);
    offerUndo(
      "Project deleted",
      () => projects.undelete(id),
      () => projects.purge(id),
    );
    // The undo bar sits under this sheet; close so it can be reached.
    onClose();
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Close"
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Archived projects</Text>
            <Touchable onPress={onClose} accessibilityLabel="Close">
              <Text style={styles.close}>✕</Text>
            </Touchable>
          </View>
          <ScrollView contentContainerStyle={styles.list}>
            {archived.length === 0 ? (
              <Text style={styles.empty}>Nothing archived.</Text>
            ) : (
              archived.map((project) =>
                confirmingId === project.id ? (
                  <View key={project.id} style={styles.confirmBox}>
                    <Text style={styles.confirmText}>
                      Delete “{project.title}” and all its items permanently?
                    </Text>
                    <View style={styles.row}>
                      <Touchable
                        onPress={() => deletePermanently(project.id)}
                        haptic="warning"
                        style={styles.confirmDelete}
                      >
                        <Text style={styles.confirmDeleteText}>
                          Delete permanently
                        </Text>
                      </Touchable>
                      <Touchable onPress={() => setConfirmingId(null)}>
                        <Text style={styles.restoreText}>Cancel</Text>
                      </Touchable>
                    </View>
                  </View>
                ) : (
                  <View key={project.id} style={styles.row}>
                    <ColorDot color={project.color} size={16} />
                    <Text style={styles.name} numberOfLines={1}>
                      {project.title}
                    </Text>
                    <Touchable
                      onPress={() => projects.restore(project.id)}
                      haptic="success"
                      style={styles.restore}
                    >
                      <Text style={styles.restoreText}>Restore</Text>
                    </Touchable>
                    <Touchable
                      onPress={() => setConfirmingId(project.id)}
                      accessibilityLabel={`Delete ${project.title}`}
                    >
                      <Text style={[styles.restoreText, styles.danger]}>
                        Delete
                      </Text>
                    </Touchable>
                  </View>
                ),
              )
            )}
          </ScrollView>
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
    maxHeight: "80%",
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
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  name: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  restore: {
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
  },
  restoreText: {
    ...typography.button,
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
