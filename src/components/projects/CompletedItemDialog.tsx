import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { PopIn } from "@/components/ui/PopIn";
import { Touchable } from "@/components/ui/Touchable";
import { colors, radius, shadow, spacing, typography } from "@/theme/tokens";

export type CompletedItemDialogProps = {
  title: string;
  onArchive: () => void;
  onDelete: () => void;
  /** Leave it completed in the list (backdrop tap does the same). */
  onKeep: () => void;
};

/** Asked just after a project item is checked off: file it away, or delete it. */
export function CompletedItemDialog({ title, onArchive, onDelete, onKeep }: CompletedItemDialogProps) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onKeep}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Keep in list" onPress={onKeep} />
        <PopIn style={styles.card}>
          <Text style={styles.title}>Done</Text>
          <Text style={styles.body} numberOfLines={3}>
            Archive “{title}” or delete it?
          </Text>

          <View style={styles.actions}>
            <Touchable onPress={onArchive} haptic="success" style={[styles.button, styles.primary]}>
              <Text style={[styles.buttonText, styles.primaryText]}>Archive</Text>
            </Touchable>
            <Touchable onPress={onDelete} haptic="warning" style={[styles.button, styles.danger]}>
              <Text style={[styles.buttonText, styles.primaryText]}>Delete</Text>
            </Touchable>
          </View>
          <Touchable variant="row" onPress={onKeep} style={styles.keep}>
            <Text style={styles.keepText}>Keep in list</Text>
          </Touchable>
        </PopIn>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.32)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    padding: spacing.lg,
    gap: spacing.sm,
    ...(Platform.OS === "web" ? { boxShadow: "0 12px 26px rgba(0,0,0,0.18)" } : shadow.floating),
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  button: {
    flex: 1,
    borderRadius: radius.medium,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  primary: {
    backgroundColor: colors.text,
  },
  danger: {
    backgroundColor: "#662C2C",
  },
  buttonText: {
    ...typography.button,
  },
  primaryText: {
    color: colors.surface,
  },
  keep: {
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  keepText: {
    ...typography.button,
    color: colors.textSecondary,
  },
});
