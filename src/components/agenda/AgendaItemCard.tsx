import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ColorDot } from "@/components/ui/ColorDot";
import { PlatformIcon } from "@/components/ui/PlatformIcon";
import { GlossyCard } from "@/components/ui/GlossyCard";
import type { AgendaItem } from "@/domain/agenda";
import { formatClock } from "@/lib/today";
import { palette, spacing, typography } from "@/theme/tokens";

export type AgendaItemCardProps = {
  item: AgendaItem;
  onToggleComplete: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onPressColor?: () => void;
};

function timeLabel(item: AgendaItem): string {
  if (item.allDay) return "All day";
  if (item.startsAt && item.endsAt) {
    return `${formatClock(item.startsAt)} - ${formatClock(item.endsAt)}`;
  }
  if (item.startsAt) return formatClock(item.startsAt);
  return "";
}

export function AgendaItemCard({
  item,
  onToggleComplete,
  onDelete,
  onEdit,
  onPressColor,
}: AgendaItemCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const ink = palette[item.color].ink;
  const done = Boolean(item.completedAt);
  const fromProject = item.origin.kind === "project";
  const repeats = Boolean(item.recurrenceRule);

  return (
    <GlossyCard color={item.color} size="task" style={done && styles.doneCard}>
      <Pressable
        onPress={onEdit}
        onLongPress={() => setMenuOpen((open) => !open)}
        accessibilityRole="button"
        accessibilityLabel={`${item.itemKind === "event" ? "Event" : "To-do"}: ${item.title}${
          done ? ", completed" : ""
        }`}
        style={styles.body}
      >
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <View style={styles.kindRow}>
              <PlatformIcon
                sf={item.itemKind === "event" ? "calendar" : "checkmark.circle"}
                ion={item.itemKind === "event" ? "calendar-outline" : "ellipse-outline"}
                size={13}
                color={ink}
              />
              <Text style={[styles.kindLabel, { color: ink }]}>
                {item.itemKind === "event" ? "Event" : "To-do"}
              </Text>
              {fromProject ? (
                <Text style={[styles.marker, { color: ink }]}>· Project</Text>
              ) : null}
              {repeats ? <Text style={[styles.marker, { color: ink }]}>· Repeats</Text> : null}
            </View>
            <Text
              style={[styles.title, { color: ink }, done && styles.doneTitle]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
          </View>

          <View style={styles.timeWrap}>
            {done ? (
              <PlatformIcon sf="checkmark" ion="checkmark" size={16} color={ink} />
            ) : null}
            {timeLabel(item) ? (
              <Text style={[styles.time, { color: ink }]}>{timeLabel(item)}</Text>
            ) : null}
            <ColorDot
              color={item.color}
              onPress={onPressColor}
              accessibilityLabel={`Change colour (currently ${item.color})`}
            />
          </View>
        </View>

        {item.notes ? (
          <Text style={[styles.notes, { color: ink }]} numberOfLines={3}>
            {item.notes}
          </Text>
        ) : null}

        {menuOpen ? (
          <View style={styles.menu}>
            <MenuAction label={done ? "Re-open" : "Complete"} onPress={onToggleComplete} ink={ink} />
            <MenuAction label="Edit" onPress={onEdit} ink={ink} />
            <MenuAction label="Delete" onPress={onDelete} ink={ink} />
          </View>
        ) : null}
      </Pressable>
    </GlossyCard>
  );
}

function MenuAction({ label, onPress, ink }: { label: string; onPress: () => void; ink: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.menuAction}>
      <Text style={[styles.menuActionText, { color: ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  doneCard: {
    opacity: 0.6,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  titleWrap: {
    flexShrink: 1,
    gap: spacing.xxs,
  },
  kindRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    flexWrap: "wrap",
  },
  kindLabel: {
    ...typography.caption,
    opacity: 0.75,
  },
  marker: {
    ...typography.caption,
    opacity: 0.6,
  },
  title: {
    ...typography.heading,
  },
  doneTitle: {
    textDecorationLine: "line-through",
  },
  timeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  time: {
    ...typography.body,
  },
  notes: {
    ...typography.body,
    opacity: 0.85,
  },
  menu: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.08)",
  },
  menuAction: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
  },
  menuActionText: {
    ...typography.button,
  },
});
