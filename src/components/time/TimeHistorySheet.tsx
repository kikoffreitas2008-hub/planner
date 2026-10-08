import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { DurationField } from "@/components/projects/DurationField";
import { AREA_LABELS } from "@/components/time/TimeLogSheet";
import { Touchable } from "@/components/ui/Touchable";
import { timeLogs } from "@/data/repositories";
import { useTimeLogs } from "@/data/timeLogs";
import { formatDuration } from "@/domain/duration";
import { minutesFor, targetFor, type TimeArea } from "@/domain/timeTracker";
import { formatDayHeading } from "@/lib/today";
import { colors, radius, shadow, spacing, typography } from "@/theme/tokens";

export type TimeHistorySheetProps = {
  area: TimeArea;
  onClose: () => void;
};

/** Every logged day for one area, newest first; tap the time to correct it. */
export function TimeHistorySheet({ area, onClose }: TimeHistorySheetProps) {
  const logs = useTimeLogs();
  const newestFirst = [...logs].reverse();

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close" onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{AREA_LABELS[area]}</Text>
            <Touchable onPress={onClose} accessibilityLabel="Close">
              <Text style={styles.close}>✕</Text>
            </Touchable>
          </View>

          <ScrollView contentContainerStyle={styles.list}>
            {newestFirst.length === 0 ? (
              <Text style={styles.empty}>No days logged yet.</Text>
            ) : (
              newestFirst.map((log) => (
                <View key={log.date} style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.day}>{formatDayHeading(log.date)}</Text>
                    <Text style={styles.target}>
                      Goal {formatDuration(targetFor(log.date, area))}
                    </Text>
                  </View>
                  <View style={styles.field}>
                    <DurationField
                      minutes={minutesFor(log, area) || null}
                      onChange={(minutes) =>
                        timeLogs.save(log.date, {
                          [area === "university" ? "university_minutes" : "extras_minutes"]:
                            minutes ?? 0,
                        })
                      }
                      title={AREA_LABELS[area]}
                      label={`time on ${AREA_LABELS[area]}`}
                    />
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
    maxHeight: "80%",
    padding: spacing.lg,
    gap: spacing.sm,
    ...(Platform.OS === "web" ? { boxShadow: "0 -8px 26px rgba(0,0,0,0.16)" } : shadow.floating),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  close: {
    ...typography.heading,
    color: colors.textSecondary,
  },
  list: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: spacing.xxs,
  },
  day: {
    ...typography.body,
    color: colors.text,
  },
  target: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  field: {
    width: 140,
  },
});
