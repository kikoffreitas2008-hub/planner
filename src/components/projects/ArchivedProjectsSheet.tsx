import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ColorDot } from "@/components/ui/ColorDot";
import { useArchivedProjects } from "@/data/projects";
import { projects } from "@/data/repositories";
import { colors, radius, shadow, spacing, typography } from "@/theme/tokens";

export function ArchivedProjectsSheet({ onClose }: { onClose: () => void }) {
  const archived = useArchivedProjects();

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close" onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Archived projects</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.list}>
            {archived.length === 0 ? (
              <Text style={styles.empty}>Nothing archived.</Text>
            ) : (
              archived.map((project) => (
                <View key={project.id} style={styles.row}>
                  <ColorDot color={project.color} size={16} />
                  <Text style={styles.name} numberOfLines={1}>
                    {project.title}
                  </Text>
                  <Pressable
                    onPress={() => projects.restore(project.id)}
                    accessibilityRole="button"
                    style={styles.restore}
                  >
                    <Text style={styles.restoreText}>Restore</Text>
                  </Pressable>
                </View>
              ))
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
});
