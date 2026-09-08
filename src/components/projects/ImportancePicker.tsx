import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { Touchable } from "@/components/ui/Touchable";
import type { ProjectItem } from "@/domain/entities";
import { colors, radius, shadow, spacing, typography } from "@/theme/tokens";

type Importance = ProjectItem["importance"];

const OPTIONS: { value: Importance; label: string; color: string }[] = [
  { value: "high", label: "High", color: "#662C2C" },
  { value: "medium", label: "Medium", color: "#673E1A" },
  { value: "low", label: "Low", color: "#173B64" },
  { value: null, label: "None", color: colors.textSecondary },
];

export function importanceLabel(value: Importance): string {
  return OPTIONS.find((option) => option.value === value)?.label ?? "None";
}

export function importanceColor(value: Importance): string {
  return OPTIONS.find((option) => option.value === value)?.color ?? colors.textSecondary;
}

export type ImportancePickerProps = {
  visible: boolean;
  value: Importance;
  onPick: (value: Importance) => void;
  onClose: () => void;
};

/** Importance starts empty; tapping offers Low / Medium / High (blueprint/01 §4.4). */
export function ImportancePicker({ visible, value, onPick, onClose }: ImportancePickerProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close" onPress={onClose} />
        <View style={styles.card}>
          <Text style={styles.title}>Importance</Text>
          {OPTIONS.map((option) => (
            <Touchable
              key={option.label}
              variant="row"
              haptic="selection"
              onPress={() => {
                onPick(option.value);
                onClose();
              }}
              accessibilityState={{ selected: option.value === value }}
              style={styles.option}
            >
              <Text style={[styles.optionText, { color: option.color }]}>{option.label}</Text>
              {option.value === value ? <Text style={styles.check}>✓</Text> : null}
            </Touchable>
          ))}
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
    maxWidth: 280,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.small,
  },
  optionText: {
    ...typography.body,
  },
  check: {
    ...typography.body,
    color: colors.text,
  },
});
