import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  MINUTE_VALUES,
  ScrollWheel,
  WHEEL_HEIGHT,
  WheelSelectionBand,
  nearestMinuteValue,
} from "@/components/ui/ScrollWheel";
import { shiftEndWithStart } from "@/domain/timeRange";
import { colors, radius, spacing, typography } from "@/theme/tokens";

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));

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

  // A new start carries the end along with it, so the length stays put
  // (as on the iPhone). A new end just changes the length.
  function moveStart(nextStart: string) {
    onChangeStart(nextStart);
    onChangeEnd(shiftEndWithStart(start, end, nextStart));
  }
  function setHour(next: string) {
    if (field === "start") moveStart(`${next}:${startM}`);
    else onChangeEnd(`${next}:${endM}`);
  }
  function setMinute(next: string) {
    if (field === "start") moveStart(`${startH}:${next}`);
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
        {/* One band across both wheels, as on iOS. */}
        <WheelSelectionBand />
        <ScrollWheel
          key={`hour-${field}`}
          values={HOURS}
          value={hour}
          onChange={setHour}
          accessibilityLabel="Hour"
          loop
          band={false}
        />
        <Text style={styles.colon}>:</Text>
        <ScrollWheel
          key={`minute-${field}`}
          values={MINUTE_VALUES}
          value={nearestMinuteValue(Number(minute))}
          onChange={setMinute}
          accessibilityLabel="Minute"
          loop
          band={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  toggle: {
    flexDirection: "row",
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.medium,
    padding: 2,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.xxs,
    alignItems: "center",
    borderRadius: radius.small,
  },
  toggleButtonActive: {
    backgroundColor: colors.surface,
  },
  toggleText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.text,
  },
  wheels: {
    height: WHEEL_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  colon: {
    ...typography.heading,
    color: colors.text,
  },
});
