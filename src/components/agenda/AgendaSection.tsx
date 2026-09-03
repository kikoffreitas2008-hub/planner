import { StyleSheet, Text, View } from "react-native";

import { AgendaItemCard } from "@/components/agenda/AgendaItemCard";
import { SwipeableRow } from "@/components/agenda/SwipeableRow";
import { useDayAgenda } from "@/data/agenda";
import { calendarItems } from "@/data/repositories";
import { offerUndo } from "@/data/undoBar";
import type { AgendaItem } from "@/domain/agenda";
import type { ISODate } from "@/domain/date";
import { colors, spacing, typography } from "@/theme/tokens";

export type AgendaSectionProps = {
  date: ISODate;
  onEditItem: (item: AgendaItem) => void;
};

export function AgendaSection({ date, onEditItem }: AgendaSectionProps) {
  const items = useDayAgenda(date);

  function toggleComplete(item: AgendaItem) {
    if (item.origin.kind !== "calendar") return;
    calendarItems.setCompleted(item.origin.id, !item.completedAt);
  }

  function remove(item: AgendaItem) {
    if (item.origin.kind !== "calendar") return;
    const id = item.origin.id;
    calendarItems.softDelete(id);
    offerUndo(
      "Item deleted",
      () => calendarItems.restore(id),
      () => calendarItems.purge(id),
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>To-do</Text>

      {items.length === 0 ? (
        <Text style={styles.empty}>Nothing scheduled. Tap + to add a to-do or event.</Text>
      ) : (
        items.map((item) => (
          <SwipeableRow
            key={item.occurrenceId}
            onSwipeRight={() => toggleComplete(item)}
            onSwipeLeft={() => remove(item)}
            rightLabel={item.completedAt ? "Re-open" : "Complete"}
          >
            <AgendaItemCard
              item={item}
              onToggleComplete={() => toggleComplete(item)}
              onDelete={() => remove(item)}
              onEdit={() => onEditItem(item)}
            />
          </SwipeableRow>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  heading: {
    ...typography.title,
    fontSize: 27,
    lineHeight: 32,
    color: colors.text,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
