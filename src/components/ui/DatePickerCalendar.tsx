import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PlatformIcon } from "@/components/ui/PlatformIcon";
import {
  calendarMonthLabel,
  monthGrid,
  moveCalendarAnchor,
  weekdayLabels,
} from "@/domain/calendarGrid";
import type { ISODate } from "@/domain/date";
import { todayInLisbon } from "@/lib/today";
import { colors, radius, spacing, typography } from "@/theme/tokens";

export type DatePickerCalendarProps = {
  value: ISODate | null;
  onChange: (date: ISODate) => void;
};

/** A month grid to pick a day — no typing (built on `domain/calendarGrid`). */
export function DatePickerCalendar({ value, onChange }: DatePickerCalendarProps) {
  const [anchor, setAnchor] = useState<ISODate>(value ?? todayInLisbon());
  const today = todayInLisbon();
  const cells = monthGrid(anchor);
  const labels = weekdayLabels();

  function shift(direction: -1 | 1) {
    setAnchor(
      moveCalendarAnchor({ selectedDate: anchor, view: "month", visibleAnchor: anchor }, direction)
        .visibleAnchor,
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable onPress={() => shift(-1)} accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={8}>
          <PlatformIcon sf="chevron.left" ion="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.month}>{calendarMonthLabel(anchor)}</Text>
        <Pressable onPress={() => shift(1)} accessibilityRole="button" accessibilityLabel="Next month" hitSlop={8}>
          <PlatformIcon sf="chevron.right" ion="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {labels.map((label) => (
          <Text key={label.compact} style={styles.weekday}>
            {label.compact}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell) => {
          const selected = cell.date === value;
          return (
            <Pressable
              key={cell.date}
              onPress={() => onChange(cell.date)}
              accessibilityRole="button"
              accessibilityLabel={cell.date}
              accessibilityState={{ selected }}
              style={styles.cell}
            >
              <View style={[styles.dayPill, selected && styles.dayPillSelected]}>
                <Text
                  style={[
                    styles.day,
                    !cell.inVisibleMonth && styles.dayMuted,
                    cell.date === today && !selected && styles.dayToday,
                    selected && styles.daySelected,
                  ]}
                >
                  {cell.day}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xxs,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xxs,
  },
  month: {
    ...typography.caption,
    color: colors.text,
  },
  weekRow: {
    flexDirection: "row",
  },
  weekday: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  dayPill: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  dayPillSelected: {
    backgroundColor: colors.text,
  },
  day: {
    ...typography.caption,
    color: colors.text,
  },
  dayMuted: {
    color: colors.textSecondary,
    opacity: 0.45,
  },
  dayToday: {
    fontWeight: "800",
  },
  daySelected: {
    color: colors.surface,
  },
});
