import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { markSwipe, swipedRecently } from "@/components/agenda/swipeGuard";
import { moveAgendaItem, resizeAgendaItem } from "@/data/agendaEdit";
import type { AgendaItem } from "@/domain/agenda";
import { weekRange, weekdayLabels } from "@/domain/calendarGrid";
import type { ISODate } from "@/domain/date";
import { layoutTimeline, type TimelinePlacement } from "@/domain/timelineLayout";
import { formatClock, todayInLisbon } from "@/lib/today";
import { isoToMinutes } from "@/lib/wallclock";
import { colors, palette, radius, spacing, typography } from "@/theme/tokens";

const PPH = 44; // points per hour
const GUTTER = 44;
const DAY_HEIGHT = PPH * 24;

export type TimelineViewProps = {
  mode: "day" | "week";
  anchor: ISODate;
  items: readonly AgendaItem[];
  onOpenItem: (item: AgendaItem) => void;
  onSelectDay: (date: ISODate) => void;
};

export function TimelineView({ mode, anchor, items, onOpenItem, onSelectDay }: TimelineViewProps) {
  const days = useMemo<ISODate[]>(
    () => (mode === "week" ? [...weekRange(anchor)] : [anchor]),
    [mode, anchor],
  );
  const labels = weekdayLabels();
  const today = todayInLisbon();

  const timedByDay = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    for (const day of days) map.set(day, []);
    for (const item of items) {
      if (item.allDay || !item.startsAt || !item.endsAt) continue;
      map.get(item.date)?.push(item);
    }
    return map;
  }, [items, days]);

  const allDayByDay = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    for (const day of days) map.set(day, []);
    for (const item of items) {
      if (item.allDay && map.has(item.date)) map.get(item.date)?.push(item);
    }
    return map;
  }, [items, days]);

  return (
    <View style={styles.wrap}>
      {mode === "week" ? (
        <View style={styles.headerRow}>
          <View style={{ width: GUTTER }} />
          {days.map((day, index) => (
            <Pressable
              key={day}
              onPress={() => onSelectDay(day)}
              style={[styles.dayHeader, day === today && styles.dayHeaderToday]}
              accessibilityRole="button"
            >
              <Text style={styles.dayHeaderName}>{labels[index].compact}</Text>
              <Text style={styles.dayHeaderNum}>{Number(day.slice(8))}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.allDayRow}>
        <Text style={[styles.allDayLabel, { width: GUTTER }]}>all-day</Text>
        {days.map((day) => (
          <View key={day} style={styles.allDayCell}>
            {(allDayByDay.get(day) ?? []).slice(0, 3).map((item) => (
              <Pressable
                key={item.occurrenceId}
                onPress={() => onOpenItem(item)}
                style={[styles.allDayChip, { backgroundColor: palette[item.color].start }]}
              >
                <Text style={[styles.allDayChipText, { color: palette[item.color].ink }]} numberOfLines={1}>
                  {item.title}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ height: DAY_HEIGHT }} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          <View style={{ width: GUTTER }}>
            {Array.from({ length: 24 }, (_, hour) => (
              <View key={hour} style={[styles.hourLabelWrap, { top: hour * PPH }]}>
                <Text style={styles.hourLabel}>{String(hour).padStart(2, "0")}</Text>
              </View>
            ))}
          </View>

          <View style={styles.columns}>
            {Array.from({ length: 24 }, (_, hour) => (
              <View key={hour} style={[styles.hourLine, { top: hour * PPH }]} />
            ))}

            {days.map((day) => (
              <View key={day} style={styles.column}>
                <DayColumn
                  date={day}
                  items={timedByDay.get(day) ?? []}
                  draggable={mode === "day"}
                  onOpenItem={onOpenItem}
                />
              </View>
            ))}

            {days.includes(today) ? (
              <View
                pointerEvents="none"
                style={[styles.nowLine, { top: (nowMinutes() / 60) * PPH }]}
              />
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function nowMinutes(): number {
  return isoToMinutes(new Date().toISOString(), todayInLisbon());
}

function DayColumn({
  date,
  items,
  draggable,
  onOpenItem,
}: {
  date: ISODate;
  items: readonly AgendaItem[];
  draggable: boolean;
  onOpenItem: (item: AgendaItem) => void;
}) {
  const placements = useMemo(
    () =>
      layoutTimeline(
        items.map((item) => ({
          id: item.occurrenceId,
          allDay: false,
          startsAt: item.startsAt,
          endsAt: item.endsAt,
        })),
        date,
        PPH,
      ),
    [items, date],
  );
  const byId = useMemo(
    () => new Map(items.map((item) => [item.occurrenceId, item])),
    [items],
  );

  return (
    <>
      {placements.map((placement) => {
        const item = byId.get(placement.id);
        if (!item) return null;
        return (
          <TimelineBlock
            key={placement.id}
            item={item}
            placement={placement}
            date={date}
            draggable={draggable}
            onOpen={() => onOpenItem(item)}
          />
        );
      })}
    </>
  );
}

function TimelineBlock({
  item,
  placement,
  date,
  draggable,
  onOpen,
}: {
  item: AgendaItem;
  placement: TimelinePlacement;
  date: ISODate;
  draggable: boolean;
  onOpen: () => void;
}) {
  const moveY = useSharedValue(0);
  const extraHeight = useSharedValue(0);
  const ink = palette[item.color].ink;

  // Drag the block to move it — the new time is written on drop, no editor.
  const move = Gesture.Pan()
    .enabled(draggable)
    .minDistance(6)
    .failOffsetX([-14, 14])
    .onBegin(() => {
      runOnJS(markSwipe)();
    })
    .onUpdate((event) => {
      moveY.value = event.translationY;
    })
    .onEnd(() => {
      const newTop = Math.max(0, placement.top + moveY.value);
      runOnJS(markSwipe)();
      runOnJS(moveAgendaItem)(item, date, (newTop / PPH) * 60);
      moveY.value = withSpring(0);
    });

  const resize = Gesture.Pan()
    .enabled(draggable)
    .minDistance(4)
    .onBegin(() => {
      runOnJS(markSwipe)();
    })
    .onUpdate((event) => {
      extraHeight.value = event.translationY;
    })
    .onEnd(() => {
      const newBottom = placement.top + placement.height + extraHeight.value;
      runOnJS(markSwipe)();
      runOnJS(resizeAgendaItem)(item, (newBottom / PPH) * 60);
      extraHeight.value = withSpring(0);
    });

  const style = useAnimatedStyle(() => ({
    top: placement.top + moveY.value,
    height: Math.max(24, placement.height + extraHeight.value),
    left: `${(placement.column / placement.columnCount) * 100}%`,
    width: `${(1 / placement.columnCount) * 100}%`,
  }));

  return (
    <Animated.View style={[styles.block, style]}>
      <GestureDetector gesture={move}>
        <Pressable
          onPress={() => {
            if (!swipedRecently()) onOpen();
          }}
          style={[styles.blockInner, { backgroundColor: palette[item.color].start }]}
        >
          <Text style={[styles.blockTitle, { color: ink }]} numberOfLines={1}>
            {item.completedAt ? "✓ " : ""}
            {item.title}
          </Text>
          {placement.height > 34 && item.startsAt && item.endsAt ? (
            <Text style={[styles.blockTime, { color: ink }]} numberOfLines={1}>
              {formatClock(item.startsAt)}–{formatClock(item.endsAt)}
            </Text>
          ) : null}
        </Pressable>
      </GestureDetector>
      {draggable ? (
        <GestureDetector gesture={resize}>
          <View style={styles.resizeHandle} accessibilityLabel="Resize" />
        </GestureDetector>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
  },
  dayHeader: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.xxs,
    borderRadius: radius.small,
  },
  dayHeaderToday: {
    backgroundColor: colors.mutedSurface,
  },
  dayHeaderName: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
  },
  dayHeaderNum: {
    ...typography.caption,
    color: colors.text,
  },
  allDayRow: {
    flexDirection: "row",
    minHeight: 22,
    alignItems: "flex-start",
  },
  allDayLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: "center",
  },
  allDayCell: {
    flex: 1,
    gap: 2,
    paddingHorizontal: 1,
  },
  allDayChip: {
    borderRadius: radius.small,
    paddingHorizontal: spacing.xxs,
    paddingVertical: 1,
  },
  allDayChipText: {
    ...typography.caption,
    fontSize: 10,
  },
  body: {
    flexDirection: "row",
    height: DAY_HEIGHT,
  },
  hourLabelWrap: {
    position: "absolute",
    right: spacing.xxs,
  },
  hourLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
  },
  columns: {
    flex: 1,
    flexDirection: "row",
    position: "relative",
  },
  hourLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.divider,
  },
  column: {
    flex: 1,
    position: "relative",
  },
  nowLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#C8402F",
  },
  block: {
    position: "absolute",
    paddingHorizontal: 1,
  },
  blockInner: {
    flex: 1,
    borderRadius: radius.small,
    paddingHorizontal: spacing.xxs,
    paddingVertical: 2,
    overflow: "hidden",
  },
  blockTitle: {
    ...typography.caption,
    fontWeight: "700",
  },
  blockTime: {
    ...typography.caption,
    fontSize: 10,
  },
  resizeHandle: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -6,
    height: 14,
  },
});
