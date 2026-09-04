import { Pressable, StyleSheet, Text, View } from "react-native";

import { PickerField } from "@/components/ui/PickerField";
import { requestNotificationPermission } from "@/data/notifications";
import { colors, radius, spacing, typography } from "@/theme/tokens";

const OPTIONS: { minutes: number; label: string }[] = [
  { minutes: 0, label: "At time" },
  { minutes: 5, label: "5 min" },
  { minutes: 10, label: "10 min" },
  { minutes: 15, label: "15 min" },
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hour" },
  { minutes: 1440, label: "1 day" },
];

export type NotificationFieldProps = {
  value: string | null;
  onChange: (json: string | null) => void;
};

function parse(value: string | null): number[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((n) => Number.isInteger(n) && n >= 0) : [];
  } catch {
    return [];
  }
}

/** Off by default, opt-in per item (blueprint/01 §6.2). */
export function NotificationField({ value, onChange }: NotificationFieldProps) {
  const selected = parse(value);
  const summary =
    selected.length === 0
      ? "Off"
      : selected
          .slice()
          .sort((a, b) => a - b)
          .map((m) => OPTIONS.find((o) => o.minutes === m)?.label ?? `${m} min`)
          .join(", ");

  function toggle(minutes: number) {
    const wasOff = selected.length === 0;
    const next = selected.includes(minutes)
      ? selected.filter((m) => m !== minutes)
      : [...selected, minutes];
    onChange(next.length ? JSON.stringify(next.sort((a, b) => a - b)) : null);
    // The permission prompt appears only in response to setting an alert,
    // never at launch (blueprint/01 §6.2). The schedule itself refreshes once
    // this change is actually saved (a store-mutation listener handles that).
    if (wasOff && next.length > 0) void requestNotificationPermission();
  }

  return (
    <PickerField label="Alert" value={summary} placeholder="Off">
      <View style={styles.chips}>
        {OPTIONS.map((option) => {
          const on = selected.includes(option.minutes);
          return (
            <Pressable
              key={option.minutes}
              onPress={() => toggle(option.minutes)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </PickerField>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  chipOn: {
    backgroundColor: colors.text,
  },
  chipText: {
    ...typography.caption,
    color: colors.text,
  },
  chipTextOn: {
    color: colors.surface,
  },
});
