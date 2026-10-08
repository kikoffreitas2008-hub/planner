import { useState } from "react";
import { Modal, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { DurationField } from "@/components/projects/DurationField";
import { Touchable } from "@/components/ui/Touchable";
import { timeLogs } from "@/data/repositories";
import type { ISODate } from "@/domain/date";
import { TIME_AREAS, type TimeArea } from "@/domain/timeTracker";
import { formatDayHeading } from "@/lib/today";
import { colors, radius, shadow, spacing, typography } from "@/theme/tokens";

export const AREA_LABELS: Record<TimeArea, string> = {
  university: "University",
  extras: "Extras",
};

type Answers = Record<string, Record<TimeArea, number | null>>;

export type TimeLogSheetProps = {
  days: readonly ISODate[];
  onClose: () => void;
};

/**
 * The after-midnight question: how much time went to each tracked area on
 * every day not yet answered. Empty saves as 0; ✕ saves nothing and the same
 * days come back on the next launch.
 */
export function TimeLogSheet({ days, onClose }: TimeLogSheetProps) {
  const [answers, setAnswers] = useState<Answers>({});

  function set(day: ISODate, area: TimeArea, minutes: number | null) {
    setAnswers((current) => ({
      ...current,
      [day]: { ...(current[day] ?? { university: null, extras: null }), [area]: minutes },
    }));
  }

  function save() {
    for (const day of days) {
      timeLogs.save(day, {
        university_minutes: answers[day]?.university ?? 0,
        extras_minutes: answers[day]?.extras ?? 0,
      });
    }
    onClose();
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>How was your time?</Text>
            <Touchable onPress={onClose} accessibilityLabel="Close">
              <Text style={styles.close}>✕</Text>
            </Touchable>
          </View>

          <ScrollView contentContainerStyle={styles.list}>
            {days.map((day) => (
              <View key={day} style={styles.day}>
                <Text style={styles.dayHeading}>{formatDayHeading(day)}</Text>
                {TIME_AREAS.map((area) => (
                  <View key={area} style={styles.areaRow}>
                    <Text style={styles.areaLabel}>{AREA_LABELS[area]}</Text>
                    <View style={styles.areaField}>
                      <DurationField
                        minutes={answers[day]?.[area] ?? null}
                        onChange={(minutes) => set(day, area, minutes)}
                        title={AREA_LABELS[area]}
                        label={`time on ${AREA_LABELS[area]}`}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>

          <Touchable onPress={save} haptic="success" style={styles.saveButton}>
            <Text style={styles.saveText}>Save</Text>
          </Touchable>
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
    maxHeight: "88%",
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
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  day: {
    gap: spacing.xs,
  },
  dayHeading: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  areaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  areaLabel: {
    ...typography.body,
    color: colors.text,
    width: 96,
  },
  areaField: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: colors.text,
    borderRadius: radius.medium,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  saveText: {
    ...typography.button,
    color: colors.surface,
  },
});
