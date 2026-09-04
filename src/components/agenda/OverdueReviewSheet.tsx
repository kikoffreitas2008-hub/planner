import { useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { DatePickerCalendar } from "@/components/ui/DatePickerCalendar";
import { TimeRangeWheels } from "@/components/ui/TimeRangeWheels";
import { calendarItems, settings } from "@/data/repositories";
import type { AgendaItem } from "@/domain/agenda";
import type { ISODate } from "@/domain/date";
import { validateOverdueReschedule } from "@/domain/overdue";
import { formatClock, formatDayHeading } from "@/lib/today";
import { colors, radius, shadow, spacing, typography } from "@/theme/tokens";

export type OverdueReviewSheetProps = {
  candidates: readonly AgendaItem[];
  today: ISODate;
  onDone: () => void;
};

/**
 * The first-launch-after-midnight review. Reschedule needs a new date AND a
 * new time — not optional (blueprint/01 section 3.6).
 */
export function OverdueReviewSheet({ candidates, today, onDone }: OverdueReviewSheetProps) {
  const [pending, setPending] = useState<readonly string[]>(() =>
    candidates.map((item) => item.origin.id),
  );

  const rows = useMemo(
    () => candidates.filter((item) => pending.includes(item.origin.id)),
    [candidates, pending],
  );

  function resolve(id: string) {
    setPending((current) => current.filter((entry) => entry !== id));
  }

  function finish() {
    settings.markOverdueReviewed(today);
    onDone();
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={finish}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Unfinished items</Text>
          <Text style={styles.subtitle}>From before {formatDayHeading(today)}</Text>

          <ScrollView contentContainerStyle={styles.list}>
            {rows.length === 0 ? (
              <Text style={styles.allDone}>All caught up.</Text>
            ) : (
              rows.map((item) => (
                <OverdueRow key={item.origin.id} item={item} onResolved={() => resolve(item.origin.id)} />
              ))
            )}
          </ScrollView>

          <Pressable onPress={finish} accessibilityRole="button" style={styles.done}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function OverdueRow({ item, onResolved }: { item: AgendaItem; onResolved: () => void }) {
  const id = item.origin.id;
  const [mode, setMode] = useState<"idle" | "reschedule">("idle");
  const [date, setDate] = useState("");
  const [start, setStart] = useState(item.startsAt ? formatClock(item.startsAt) : "09:00");
  const [end, setEnd] = useState(item.endsAt ? formatClock(item.endsAt) : "10:00");
  const [error, setError] = useState<string | null>(null);

  function keep() {
    onResolved();
  }

  function remove() {
    calendarItems.softDelete(id);
    onResolved();
  }

  function confirmReschedule() {
    const result = validateOverdueReschedule(item, { date, start, end });
    if (!result.valid) {
      setError(result.reason);
      return;
    }
    calendarItems.update(id, {
      date: result.date,
      starts_at: result.startsAt,
      ends_at: result.endsAt,
    });
    onResolved();
  }

  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle}>{item.title}</Text>
      <Text style={styles.rowMeta}>Was on {item.date}</Text>

      {mode === "idle" ? (
        <View style={styles.actions}>
          <Action label="Reschedule" onPress={() => setMode("reschedule")} />
          <Action label="Keep" onPress={keep} />
          <Action label="Delete" onPress={remove} />
        </View>
      ) : (
        <View style={styles.reschedule}>
          <Text style={styles.rowMeta}>Pick a new day and time</Text>
          <DatePickerCalendar
            value={/^\d{4}-\d{2}-\d{2}$/.test(date) ? (date as ISODate) : null}
            onChange={setDate}
          />
          <TimeRangeWheels start={start} end={end} onChangeStart={setStart} onChangeEnd={setEnd} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Action label="Confirm" onPress={confirmReschedule} primary />
            <Action label="Cancel" onPress={() => setMode("idle")} />
          </View>
        </View>
      )}
    </View>
  );
}

function Action({
  label,
  onPress,
  primary,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.action, primary && styles.actionPrimary]}
    >
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.32)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
    maxHeight: "88%",
    padding: spacing.lg,
    gap: spacing.sm,
    ...(Platform.OS === "web" ? { boxShadow: "0 -8px 26px rgba(0,0,0,0.16)" } : shadow.floating),
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  list: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  allDone: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  row: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.medium,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  rowTitle: {
    ...typography.body,
    color: colors.text,
  },
  rowMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
    flexWrap: "wrap",
  },
  action: {
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  actionPrimary: {
    backgroundColor: colors.text,
  },
  actionText: {
    ...typography.button,
    color: colors.text,
  },
  actionTextPrimary: {
    color: colors.surface,
  },
  reschedule: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  input: {
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.medium,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  timeRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  timeInput: {
    flex: 1,
  },
  error: {
    ...typography.caption,
    color: "#662C2C",
  },
  done: {
    backgroundColor: colors.text,
    borderRadius: radius.medium,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  doneText: {
    ...typography.button,
    color: colors.surface,
  },
});
