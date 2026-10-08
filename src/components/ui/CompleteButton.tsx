import { StyleSheet, Text } from "react-native";

import { Touchable } from "@/components/ui/Touchable";
import { colors, radius, spacing, typography } from "@/theme/tokens";

export type CompleteButtonProps = {
  done: boolean;
  onPress: () => void;
};

/**
 * Mark an item done (or not) from its edit sheet — the one way to confirm an
 * item that has no checkbox where it is shown, such as a past day in Calendar.
 */
export function CompleteButton({ done, onPress }: CompleteButtonProps) {
  return (
    <Touchable
      onPress={onPress}
      haptic={done ? "selection" : "success"}
      style={styles.button}
    >
      <Text style={styles.text}>{done ? "Mark as not done" : "✓  Mark as done"}</Text>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: colors.text,
    borderRadius: radius.medium,
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  text: {
    ...typography.button,
    color: colors.text,
  },
});
