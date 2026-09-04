import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { RoundIconButton } from "@/components/ui/RoundIconButton";
import { colors, layoutTokens, radius, shadow, spacing, typography } from "@/theme/tokens";

export type PlusMenuOption = {
  key: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

/** The contextual `+` button. Its options change per tab (blueprint/01 section 2). */
export function PlusMenu({ options }: { options: readonly PlusMenuOption[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <RoundIconButton
        sf="plus"
        ion="add"
        accessibilityLabel="Create"
        onPress={() => setOpen(true)}
      />
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.root}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Dismiss menu"
            onPress={() => setOpen(false)}
          />
          <View style={styles.menu}>
            {options.map((option) => (
              <Pressable
                key={option.key}
                disabled={option.disabled}
                onPress={() => {
                  setOpen(false);
                  option.onPress();
                }}
                accessibilityRole="menuitem"
                style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              >
                <Text style={[styles.itemText, option.disabled && styles.itemTextDisabled]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "flex-end",
    paddingTop: 96,
    paddingHorizontal: layoutTokens.horizontalPadding,
  },
  menu: {
    minWidth: 210,
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    paddingVertical: spacing.xs,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 12px 26px rgba(0, 0, 0, 0.18)" }
      : shadow.floating),
  },
  item: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  itemPressed: {
    backgroundColor: colors.mutedSurface,
  },
  itemText: {
    ...typography.body,
    color: colors.text,
  },
  itemTextDisabled: {
    color: colors.textSecondary,
  },
});
