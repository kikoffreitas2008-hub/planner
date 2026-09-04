import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { generateKeyBetween } from "fractional-indexing";

import { AgendaItemCard } from "@/components/agenda/AgendaItemCard";
import { SwipeableRow } from "@/components/agenda/SwipeableRow";
import { swipedRecently } from "@/components/agenda/swipeGuard";
import { TimeEditModal } from "@/components/agenda/TimeEditModal";
import { DraggableColumn } from "@/components/projects/DraggableColumn";
import { useDayAgenda } from "@/data/agenda";
import { calendarItems, projectItems, settings } from "@/data/repositories";
import { getDatabase, useUserSettings } from "@/data/store";
import { offerUndo } from "@/data/undoBar";
import type { AgendaItem } from "@/domain/agenda";
import type { ISODate } from "@/domain/date";
import { colors, radius, spacing, typography, type PaletteKey } from "@/theme/tokens";

export type AgendaSectionProps = {
  date: ISODate;
  onEditItem: (item: AgendaItem) => void;
  isPlanningTomorrow: boolean;
  onPlanTomorrow: () => void;
  onExitPlanTomorrow: () => void;
};

export function AgendaSection({
  date,
  onEditItem,
  isPlanningTomorrow,
  onPlanTomorrow,
  onExitPlanTomorrow,
}: AgendaSectionProps) {
  const items = useDayAgenda(date);
  const manualDatesJson = useUserSettings()?.today_manual_dates ?? "[]";
  const [editMode, setEditMode] = useState(false);
  const [timeEditItem, setTimeEditItem] = useState<AgendaItem | null>(null);

  const manualOrdered = useMemo(() => {
    try {
      return new Set<string>(JSON.parse(manualDatesJson)).has(date);
    } catch {
      return false;
    }
  }, [manualDatesJson, date]);

  function toggleComplete(item: AgendaItem) {
    const done = !item.completedAt;
    if (item.origin.kind === "calendar") calendarItems.setCompleted(item.origin.id, done);
    else projectItems.setCompleted(item.origin.id, done);
  }

  function remove(item: AgendaItem) {
    if (item.origin.kind === "calendar") {
      const id = item.origin.id;
      calendarItems.softDelete(id);
      offerUndo("Item deleted", () => calendarItems.restore(id), () => calendarItems.purge(id));
      return;
    }
    const id = item.origin.id;
    const snapshot = getDatabase().project_items[id];
    if (!snapshot) return;
    projectItems.unschedule(id);
    offerUndo(
      "Removed from today",
      () =>
        projectItems.schedule(id, {
          scheduled_date: snapshot.scheduled_date,
          scheduled_all_day: snapshot.scheduled_all_day,
          scheduled_starts_at: snapshot.scheduled_starts_at,
          scheduled_ends_at: snapshot.scheduled_ends_at,
        }),
      () => {},
    );
  }

  function reorder(orderedOccurrenceIds: string[]) {
    const byOcc = new Map(items.map((entry) => [entry.occurrenceId, entry]));
    let previous: string | null = null;
    for (const occurrenceId of orderedOccurrenceIds) {
      const entry = byOcc.get(occurrenceId);
      if (!entry) continue;
      const key = generateKeyBetween(previous, null);
      if (entry.origin.kind === "calendar") {
        calendarItems.update(entry.origin.id, { manual_sort_key: key });
      } else {
        projectItems.update(entry.origin.id, { manual_sort_key: key });
      }
      previous = key;
    }
    settings.setDayManualOrder(date, true);
  }

  const rows = items.map((item) => ({ id: item.occurrenceId, item }));

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>To-do</Text>
        <View style={styles.controls}>
          {manualOrdered ? (
            <Pressable
              onPress={() => settings.setDayManualOrder(date, false)}
              accessibilityRole="button"
              style={styles.controlButton}
            >
              <Text style={styles.controlText}>By time</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={isPlanningTomorrow ? onExitPlanTomorrow : onPlanTomorrow}
            accessibilityRole="button"
            style={styles.controlButton}
          >
            <Text style={styles.controlText}>
              {isPlanningTomorrow ? "Back to today" : "Plan tomorrow"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setEditMode((on) => !on)}
            accessibilityRole="button"
            accessibilityState={{ selected: editMode }}
            style={styles.controlButton}
          >
            <Text style={styles.controlText}>{editMode ? "Done" : "Edit"}</Text>
          </Pressable>
        </View>
      </View>

      {items.length === 0 ? (
        <Text style={styles.empty}>Nothing scheduled. Tap + to add a to-do or event.</Text>
      ) : (
        <DraggableColumn
          data={rows}
          enabled={!editMode}
          estimatedRowHeight={140}
          onReorder={reorder}
          renderItem={({ item }) => (
            <View style={styles.rowSpacing}>
              <SwipeableRow
                enabled={!editMode}
                onSwipeRight={() => toggleComplete(item)}
                onSwipeLeft={() => remove(item)}
                rightLabel={item.completedAt ? "Re-open" : "Complete"}
              >
                <AgendaItemCard
                  item={item}
                  editMode={editMode}
                  onToggleComplete={() => toggleComplete(item)}
                  onDelete={() => remove(item)}
                  onEdit={() => {
                    if (!swipedRecently()) onEditItem(item);
                  }}
                  onEditTime={() => setTimeEditItem(item)}
                  onChangeColor={
                    item.origin.kind === "calendar"
                      ? (color: PaletteKey) => {
                          if (item.origin.kind === "calendar") {
                            calendarItems.setColor(item.origin.id, color);
                          }
                        }
                      : undefined
                  }
                />
              </SwipeableRow>
            </View>
          )}
        />
      )}

      {timeEditItem ? (
        <TimeEditModal
          visible
          item={timeEditItem}
          onClose={() => setTimeEditItem(null)}
          onSave={(startsAt, endsAt) => {
            if (timeEditItem.origin.kind === "calendar") {
              calendarItems.update(timeEditItem.origin.id, { starts_at: startsAt, ends_at: endsAt });
            } else {
              projectItems.update(timeEditItem.origin.id, {
                scheduled_starts_at: startsAt,
                scheduled_ends_at: endsAt,
              });
            }
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  heading: {
    ...typography.title,
    fontSize: 27,
    lineHeight: 32,
    color: colors.text,
  },
  controls: {
    flexDirection: "row",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  controlButton: {
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  controlText: {
    ...typography.button,
    color: colors.text,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
  },
  rowSpacing: {
    paddingBottom: spacing.md,
  },
});
