import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { Touchable } from "@/components/ui/Touchable";
import type { RecurrenceScope } from "@/domain/recurrenceMutation";
import { colors, radius, shadow, spacing, typography } from "@/theme/tokens";

export type RecurrenceScopeDialogProps = {
  visible: boolean;
  action: "edit" | "delete";
  onPick: (scope: RecurrenceScope) => void;
  onCancel: () => void;
};

const OPTIONS: { scope: RecurrenceScope; label: string }[] = [
  { scope: "one", label: "This occurrence only" },
  { scope: "future", label: "This and all following" },
  { scope: "all", label: "The whole series" },
];

/** Blueprint/01 §6.1 — the three edit scopes for a recurring item. */
export function RecurrenceScopeDialog({
  visible,
  action,
  onPick,
  onCancel,
}: RecurrenceScopeDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Cancel" onPress={onCancel} />
        <View style={styles.card}>
          <Text style={styles.title}>{action === "delete" ? "Delete" : "Apply changes to"}</Text>
          {OPTIONS.map((option) => (
            <Touchable
              key={option.scope}
              variant="row"
              onPress={() => onPick(option.scope)}
              style={styles.option}
            >
              <Text style={styles.optionText}>{option.label}</Text>
            </Touchable>
          ))}
          <Touchable onPress={onCancel} style={styles.cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Touchable>
        </View>
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
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    padding: spacing.md,
    gap: spacing.xxs,
    ...(Platform.OS === "web" ? { boxShadow: "0 12px 26px rgba(0,0,0,0.18)" } : shadow.floating),
  },
  title: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  option: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.small,
  },
  optionText: {
    ...typography.body,
    color: colors.text,
  },
  cancel: {
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  cancelText: {
    ...typography.button,
    color: colors.textSecondary,
  },
});
