import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { PlatformIcon } from "@/components/ui/PlatformIcon";
import { Touchable } from "@/components/ui/Touchable";
import {
  CALENDAR_VIEWS,
  calendarViewLabel,
  type CalendarView,
} from "@/domain/calendarGrid";
import { colors, layoutTokens, radius, shadow, spacing, typography } from "@/theme/tokens";

export type ViewSwitcherProps = {
  value: CalendarView;
  onChange: (view: CalendarView) => void;
};

/**
 * The Calendar's Month / Week / Day control, collapsed to one pill. Showing
 * the three choices inline pushed the screen title onto a second line on a
 * phone; this trigger states the current view and opens the rest as an
 * anchored dropdown (same pattern as PlusMenu).
 */
export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Touchable
        style={styles.trigger}
        haptic="selection"
        accessibilityLabel={`Calendar view: ${calendarViewLabel(value)}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(true)}
      >
        <Text style={styles.triggerText}>{calendarViewLabel(value)}</Text>
        <PlatformIcon sf="chevron.down" ion="chevron-down" size={13} color={colors.text} />
      </Touchable>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityLabel="Dismiss menu"
          accessibilityRole="button"
          onPress={() => setOpen(false)}
        />
        <Animated.View
          entering={FadeIn.duration(120)}
          exiting={FadeOut.duration(90)}
          style={styles.menu}
        >
          {CALENDAR_VIEWS.map((option) => {
            const selected = option === value;
            return (
              <Touchable
                key={option}
                variant="row"
                haptic="selection"
                accessibilityRole="menuitem"
                accessibilityState={{ selected }}
                style={styles.item}
                onPress={() => {
                  setOpen(false);
                  if (!selected) onChange(option);
                }}
              >
                <Text style={[styles.itemText, selected && styles.itemTextOn]}>
                  {calendarViewLabel(option)}
                </Text>
                {selected ? (
                  <PlatformIcon sf="checkmark" ion="checkmark" size={16} color={colors.text} />
                ) : null}
              </Touchable>
            );
          })}
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    height: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.mutedSurface,
  },
  triggerText: {
    ...typography.button,
    color: colors.text,
  },
  menu: {
    position: "absolute",
    top: 96,
    right: layoutTokens.horizontalPadding,
    minWidth: 168,
    backgroundColor: colors.surface,
    borderRadius: radius.medium,
    paddingVertical: spacing.xs,
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0 12px 26px rgba(0, 0, 0, 0.18)" } as object)
      : shadow.floating),
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    minHeight: 44,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  itemText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  itemTextOn: {
    color: colors.text,
  },
});
