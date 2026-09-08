import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Touchable } from "@/components/ui/Touchable";
import type { AgendaItem } from "@/domain/agenda";
import { monthGrid, weekdayLabels } from "@/domain/calendarGrid";
import type { ISODate } from "@/domain/date";
import { todayInLisbon } from "@/lib/today";
import { colors, palette, radius, spacing, typography } from "@/theme/tokens";

export type MonthGridProps = {
  anchor: ISODate;
  selected: ISODate;
  items: readonly AgendaItem[];
  onSelect: (date: ISODate) => void;
};

export function MonthGrid({ anchor, selected, items, onSelect }: MonthGridProps) {
  const cells = useMemo(() => monthGrid(anchor), [anchor]);
  const labels = weekdayLabels();
  const today = todayInLisbon();

  const byDate = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    for (const item of items) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return map;
  }, [items]);

  return (
    <View style={styles.wrap}>
      <View style={styles.weekRow}>
        {labels.map((label) => (
          <Text key={label.compact} style={styles.weekday}>
            {label.compact}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((cell) => {
          const dayItems = byDate.get(cell.date) ?? [];
          const isSelected = cell.date === selected;
          return (
            <Touchable
              key={cell.date}
              variant="row"
              haptic="selection"
              onPress={() => onSelect(cell.date)}
              accessibilityLabel={cell.date}
              accessibilityState={{ selected: isSelected }}
              style={[styles.cell, isSelected && styles.cellSelected]}
            >
              <Text
                style={[
                  styles.day,
                  !cell.inVisibleMonth && styles.dayMuted,
                  cell.date === today && styles.dayToday,
                  isSelected && styles.daySelectedText,
                ]}
              >
                {cell.day}
              </Text>
              <View style={styles.dots}>
                {dayItems.slice(0, 4).map((item) => (
                  <View
                    key={item.occurrenceId}
                    style={[styles.dot, { backgroundColor: palette[item.color].start }]}
                  />
                ))}
              </View>
            </Touchable>
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
    height: 52,
    paddingTop: spacing.xxs,
    alignItems: "center",
    borderRadius: radius.small,
  },
  cellSelected: {
    backgroundColor: colors.mutedSurface,
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
  daySelectedText: {
    fontWeight: "800",
  },
  dots: {
    flexDirection: "row",
    gap: 2,
    marginTop: 3,
    minHeight: 6,
    flexWrap: "wrap",
    justifyContent: "center",
    maxWidth: "90%",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});
