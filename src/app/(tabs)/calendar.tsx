import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AgendaFormModal, type AgendaFormResult } from "@/components/agenda/AgendaFormModal";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { TimelineView } from "@/components/calendar/TimelineView";
import { AppScreen } from "@/components/ui/AppScreen";
import { PlatformIcon } from "@/components/ui/PlatformIcon";
import { PlusMenu } from "@/components/ui/PlusMenu";
import { useDayAgenda, useRangeAgenda } from "@/data/agenda";
import { applyFormEdit, createFromForm, deleteAgendaItem } from "@/data/agendaEdit";
import { useUserSettings } from "@/data/store";
import type { AgendaItem } from "@/domain/agenda";
import {
  calendarDayLabel,
  calendarMonthLabel,
  monthGrid,
  moveCalendarAnchor,
  weekRange,
} from "@/domain/calendarGrid";
import type { ISODate } from "@/domain/date";
import type { RecurrenceScope } from "@/domain/recurrenceMutation";
import { formatClock, formatDMY, nextDate, previousDate, todayInLisbon } from "@/lib/today";
import { colors, palette, radius, spacing, typography } from "@/theme/tokens";

type CalendarView = "month" | "week" | "day";

type FormState =
  | null
  | { mode: "create"; itemType: "task" | "event" }
  | { mode: "edit"; item: AgendaItem };

export default function CalendarScreen() {
  const defaultView = useUserSettings()?.default_calendar_view ?? "month";
  const [view, setView] = useState<CalendarView>(defaultView);
  const [focusDate, setFocusDate] = useState<ISODate>(todayInLisbon());
  const [form, setForm] = useState<FormState>(null);

  const range = useMemo(() => {
    if (view === "day") return { start: focusDate, end: focusDate };
    if (view === "week") {
      const week = weekRange(focusDate);
      return { start: week[0], end: week[6] };
    }
    const grid = monthGrid(focusDate);
    return { start: grid[0].date, end: grid[grid.length - 1].date };
  }, [view, focusDate]);

  const rangeItems = useRangeAgenda(range.start, range.end);
  const dayItems = useDayAgenda(focusDate);

  function shift(direction: -1 | 1) {
    if (view === "month") {
      setFocusDate(
        moveCalendarAnchor(
          { selectedDate: focusDate, view: "month", visibleAnchor: focusDate },
          direction,
        ).visibleAnchor,
      );
    } else if (view === "week") {
      let cursor = focusDate;
      for (let i = 0; i < 7; i += 1) cursor = direction === 1 ? nextDate(cursor) : previousDate(cursor);
      setFocusDate(cursor);
    } else {
      setFocusDate(direction === 1 ? nextDate(focusDate) : previousDate(focusDate));
    }
  }

  function handleSubmit(result: AgendaFormResult, scope?: RecurrenceScope) {
    if (form?.mode === "edit") applyFormEdit(form.item, result, scope);
    else createFromForm(result);
    setForm(null);
  }
  function handleDelete(scope?: RecurrenceScope) {
    if (form?.mode === "edit") deleteAgendaItem(form.item, scope);
    setForm(null);
  }

  const label =
    view === "month"
      ? calendarMonthLabel(focusDate)
      : view === "day"
        ? calendarDayLabel(focusDate)
        : `${formatDMY(range.start as ISODate)} – ${formatDMY(range.end as ISODate)}`;

  return (
    <AppScreen
      title="Calendar"
      scroll={view === "month"}
      headerRight={
        <>
          <View style={styles.viewSwitch}>
            {(["month", "week", "day"] as const).map((option) => (
              <Pressable
                key={option}
                onPress={() => setView(option)}
                accessibilityRole="button"
                accessibilityState={{ selected: view === option }}
                style={[styles.viewButton, view === option && styles.viewButtonOn]}
              >
                <Text style={[styles.viewText, view === option && styles.viewTextOn]}>
                  {option[0].toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
          <PlusMenu
            options={[
              {
                key: "task",
                label: "New task",
                onPress: () => setForm({ mode: "create", itemType: "task" }),
              },
              {
                key: "event",
                label: "New event",
                onPress: () => setForm({ mode: "create", itemType: "event" }),
              },
            ]}
          />
        </>
      }
    >
      <View style={styles.navRow}>
        <Pressable onPress={() => shift(-1)} accessibilityRole="button" accessibilityLabel="Previous" hitSlop={8}>
          <PlatformIcon sf="chevron.left" ion="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={styles.navLabel}>{label}</Text>
        <Pressable onPress={() => shift(1)} accessibilityRole="button" accessibilityLabel="Next" hitSlop={8}>
          <PlatformIcon sf="chevron.right" ion="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>

      {view === "month" ? (
        <>
          <MonthGrid
            anchor={focusDate}
            selected={focusDate}
            items={rangeItems}
            onSelect={setFocusDate}
          />
          <View style={styles.dayList}>
            <Text style={styles.dayListHeading}>{calendarDayLabel(focusDate)}</Text>
            {dayItems.length === 0 ? (
              <Text style={styles.empty}>Nothing on this day.</Text>
            ) : (
              dayItems.map((item) => (
                <Pressable
                  key={item.occurrenceId}
                  onPress={() => setForm({ mode: "edit", item })}
                  style={styles.dayRow}
                  accessibilityRole="button"
                >
                  <View style={[styles.rowDot, { backgroundColor: palette[item.color].start }]} />
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.completedAt ? "✓ " : ""}
                    {item.title}
                  </Text>
                  <Text style={styles.rowTime}>
                    {item.allDay
                      ? "All day"
                      : item.startsAt
                        ? formatClock(item.startsAt)
                        : ""}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        </>
      ) : (
        <TimelineView
          mode={view}
          anchor={focusDate}
          items={rangeItems}
          onOpenItem={(item) => setForm({ mode: "edit", item })}
          onSelectDay={(day) => {
            setFocusDate(day);
            setView("day");
          }}
        />
      )}

      {form ? (
        <AgendaFormModal
          visible
          defaultDate={focusDate}
          initial={form}
          onCancel={() => setForm(null)}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
        />
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  viewSwitch: {
    flexDirection: "row",
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.pill,
    padding: 2,
  },
  viewButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
  },
  viewButtonOn: {
    backgroundColor: colors.text,
  },
  viewText: {
    ...typography.button,
    color: colors.text,
  },
  viewTextOn: {
    color: colors.surface,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  navLabel: {
    ...typography.heading,
    color: colors.text,
  },
  dayList: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  dayListHeading: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowTitle: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  rowTime: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
