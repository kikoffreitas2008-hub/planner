import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useLocalSearchParams } from "expo-router";

import { AgendaFormModal, type AgendaFormResult } from "@/components/agenda/AgendaFormModal";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { TimelineView } from "@/components/calendar/TimelineView";
import { AppScreen } from "@/components/ui/AppScreen";
import { GlobalSearchButton } from "@/components/search/GlobalSearchButton";
import { PlatformIcon } from "@/components/ui/PlatformIcon";
import { PlusMenu } from "@/components/ui/PlusMenu";
import { Touchable } from "@/components/ui/Touchable";
import { ViewSwitcher } from "@/components/ui/ViewSwitcher";
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
  type CalendarView,
} from "@/domain/calendarGrid";
import type { ISODate } from "@/domain/date";
import type { RecurrenceScope } from "@/domain/recurrenceMutation";
import { formatClock, formatDMY, nextDate, previousDate, todayInLisbon } from "@/lib/today";
import { colors, palette, spacing, typography } from "@/theme/tokens";

type FormState =
  | null
  | { mode: "create"; itemType: "task" | "event" }
  | { mode: "edit"; item: AgendaItem };

export default function CalendarScreen() {
  const settings = useUserSettings();
  const defaultView = settings?.default_calendar_view ?? "month";
  const reduceMotion = settings?.reduce_motion ?? false;
  // A search result can deep-link here with ?date=YYYY-MM-DD&view=day.
  const params = useLocalSearchParams<{ date?: string; view?: string }>();
  const [view, setView] = useState<CalendarView>(() =>
    params.view === "day" || params.view === "week" || params.view === "month"
      ? params.view
      : defaultView,
  );
  const [focusDate, setFocusDate] = useState<ISODate>(() =>
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? (params.date as ISODate) : todayInLisbon(),
  );
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
          <ViewSwitcher value={view} onChange={setView} />
          <GlobalSearchButton />
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
        <Touchable
          onPress={() => shift(-1)}
          accessibilityLabel="Previous"
          hitSlop={12}
          style={styles.navArrow}
        >
          <PlatformIcon sf="chevron.left" ion="chevron-back" size={20} color={colors.text} />
        </Touchable>
        <Text style={styles.navLabel} numberOfLines={1}>
          {label}
        </Text>
        <Touchable
          onPress={() => shift(1)}
          accessibilityLabel="Next"
          hitSlop={12}
          style={styles.navArrow}
        >
          <PlatformIcon sf="chevron.right" ion="chevron-forward" size={20} color={colors.text} />
        </Touchable>
      </View>

      <Animated.View
        // Re-key on the view so Month↔Week↔Day crossfades; date shifts within
        // a view update in place (the timeline animates its own transition).
        key={reduceMotion ? undefined : view}
        entering={reduceMotion ? undefined : FadeIn.duration(180)}
        style={styles.viewBody}
      >
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
                  <Touchable
                    key={item.occurrenceId}
                    variant="row"
                    onPress={() => setForm({ mode: "edit", item })}
                    style={styles.dayRow}
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
                  </Touchable>
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
      </Animated.View>

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
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs,
  },
  navArrow: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    ...typography.heading,
    color: colors.text,
    flex: 1,
    textAlign: "center",
  },
  viewBody: {
    gap: spacing.md,
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
