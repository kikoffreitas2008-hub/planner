import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PlatformIcon } from "@/components/ui/PlatformIcon";
import { colors, radius, spacing, typography } from "@/theme/tokens";

export type PickerFieldProps = {
  label: string;
  /** The current value shown in the collapsed row. */
  value: string;
  /** Shown when there is no value yet. */
  placeholder?: string;
  /** The picker, revealed below the row when tapped. */
  children: ReactNode;
  defaultOpen?: boolean;
};

/**
 * A collapsed field that shows its value and expands its picker (a calendar,
 * a wheel) inline when tapped.
 */
export function PickerField({
  label,
  value,
  placeholder = "Choose",
  children,
  defaultOpen = false,
}: PickerFieldProps) {
  const [open, setOpen] = useState(defaultOpen);
  const hasValue = value.trim().length > 0;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setOpen((current) => !current)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.row}
      >
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, !hasValue && styles.placeholder]}>
          {hasValue ? value : placeholder}
        </Text>
        <PlatformIcon
          sf={open ? "chevron.up" : "chevron.down"}
          ion={open ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.textSecondary}
        />
      </Pressable>
      {open ? <View style={styles.picker}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.medium,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    width: 56,
  },
  value: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  placeholder: {
    color: colors.textSecondary,
  },
  picker: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
});
