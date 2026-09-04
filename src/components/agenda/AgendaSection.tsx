import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AgendaItemCard } from "@/components/agenda/AgendaItemCard";
import { SwipeableRow } from "@/components/agenda/SwipeableRow";
import { swipedRecently } from "@/components/agenda/swipeGuard";
import { TimeEditModal } from "@/components/agenda/TimeEditModal";
import { useDayAgenda } from "@/data/agenda";
import { calendarItems, projectItems } from "@/data/repositories";
import { getDatabase } from "@/data/store";
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
  const [editMode, setEditMode] = useState(false);
  const [timeEditItem, setTimeEditItem] = useState<AgendaItem | null>(null);

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
    // A project item is a shared record — swipe-delete on Today just takes it
    // off the day; the item stays in its project.
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

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>To-do</Text>
        <View style={styles.controls}>
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
        items.map((item) => (
          <SwipeableRow
            key={item.occurrenceId}
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
        ))
      )}

      {timeEditItem ? (
        <TimeEditModal
          visible
          item={timeEditItem}
          onClose={() => setTimeEditItem(null)}
          onSave={(startsAt, endsAt) => {
            if (timeEditItem.origin.kind === "calendar") {
              calendarItems.update(timeEditItem.origin.id, {
                starts_at: startsAt,
                ends_at: endsAt,
              });
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
});
