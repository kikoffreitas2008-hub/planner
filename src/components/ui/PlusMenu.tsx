import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { Overlay } from "@/components/ui/Overlay";
import { PopIn } from "@/components/ui/PopIn";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import { Touchable } from "@/components/ui/Touchable";
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
  // Bumped on every open so PopIn's inner Animated.View always remounts
  // fresh. On native the Modal stays mounted across opens (visible={open}),
  // and PopIn's entering animation only plays once, on mount; if an open
  // races a still-settling close the content could stay hidden. Remounting
  // PopIn on every open sidesteps that. (On web the Overlay unmounts on close.)
  const [openId, setOpenId] = useState(0);

  return (
    <>
      <RoundIconButton
        sf="plus"
        ion="add"
        accessibilityLabel="Create"
        onPress={() => {
          setOpenId((n) => n + 1);
          setOpen(true);
        }}
      />
      <Overlay visible={open} onRequestClose={() => setOpen(false)}>
        <View style={styles.root}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Dismiss menu"
            onPress={() => setOpen(false)}
          />
          <PopIn key={openId} style={styles.menu}>
            {options.map((option) => (
              <Touchable
                key={option.key}
                variant="row"
                disabled={option.disabled}
                onPress={() => {
                  setOpen(false);
                  option.onPress();
                }}
                accessibilityRole="menuitem"
                style={styles.item}
              >
                <Text style={[styles.itemText, option.disabled && styles.itemTextDisabled]}>
                  {option.label}
                </Text>
              </Touchable>
            ))}
          </PopIn>
        </View>
      </Overlay>
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
  itemText: {
    ...typography.body,
    color: colors.text,
  },
  itemTextDisabled: {
    color: colors.textSecondary,
  },
});
