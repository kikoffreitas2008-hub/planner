import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ScrollWheel } from "@/components/ui/ScrollWheel";
import { colors, radius, spacing, typography } from "@/theme/tokens";

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

export type TimeRangeWheelsProps = {
  /** "HH:MM" */
  start: string;
  /** "HH:MM" */
  end: string;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
};

/** A Start/End toggle with two snapping wheels, shared by edit mode and scheduling. */
export function TimeRangeWheels({ start, end, onChangeStart, onChangeEnd }: TimeRangeWheelsProps) {
  const [field, setField] = useState<"start" | "end">("start");

  const [startH, startM] = start.split(":");
  const [endH, endM] = end.split(":");
  const hour = field === "start" ? startH : endH;
  const minute = field === "start" ? startM : endM;

  function setHour(next: string) {
    if (field === "start") onChangeStart(`${next}:${startM}`);
    else onChangeEnd(`${next}:${endM}`);
  }
  function setMinute(next: string) {
    if (field === "start") onChangeStart(`${startH}:${next}`);
    else onChangeEnd(`${endH}:${next}`);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.toggle}>
        {(["start", "end"] as const).map((option) => (
          <Pressable
            key={option}
            onPress={() => setField(option)}
            accessibilityRole="button"
            accessibilityState={{ selected: field === option }}
            style={[styles.toggleButton, field === option && styles.toggleButtonActive]}
          >
            <Text style={[styles.toggleText, field === option && styles.toggleTextActive]}>
              {option === "start" ? `Start ${start}` : `End ${end}`}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.wheels}>
        <ScrollWheel
          key={`hour-${field}`}
          values={HOURS}
          value={hour}
          onChange={setHour}
          accessibilityLabel="Hour"
        />
        <Text style={styles.colon}>:</Text>
        <ScrollWheel
          key={`minute-${field}`}
          values={MINUTES}
          value={minute}
          onChange={setMinute}
          accessibilityLabel="Minute"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.medium,
    padding: 3,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: "center",
    borderRadius: radius.small,
  },
  toggleButtonActive: {
    backgroundColor: colors.surface,
  },
  toggleText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.text,
  },
  wheels: {
    height: 200,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  colon: {
    ...typography.title,
    color: colors.text,
  },
});
