import { useMemo, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { TimeRangeWheels } from "@/components/ui/TimeRangeWheels";
import type { AgendaItem } from "@/domain/agenda";
import { validateTimeRange } from "@/domain/timeRange";
import { formatClock } from "@/lib/today";
import { colors, radius, shadow, spacing, typography } from "@/theme/tokens";

export type TimeEditModalProps = {
  visible: boolean;
  item: AgendaItem;
  onSave: (startsAt: string, endsAt: string) => void;
  onClose: () => void;
};

/** The square time picker from edit mode (blueprint/01 section 3.4). */
export function TimeEditModal({ visible, item, onSave, onClose }: TimeEditModalProps) {
  const [start, setStart] = useState(item.startsAt ? formatClock(item.startsAt) : "09:00");
  const [end, setEnd] = useState(item.endsAt ? formatClock(item.endsAt) : "10:00");
  const [confirmMidnight, setConfirmMidnight] = useState(false);

  const result = useMemo(
    () => validateTimeRange({ date: item.date, start, end, crossesMidnight: confirmMidnight }),
    [item.date, start, end, confirmMidnight],
  );

  function save() {
    if (result.valid) {
      onSave(result.startsAt, result.endsAt);
      onClose();
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close" onPress={onClose} />
        <View style={styles.card}>
          <Pressable
            onPress={onClose}
            style={styles.close}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={10}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          <Text style={styles.heading}>Time</Text>

          <TimeRangeWheels
            start={start}
            end={end}
            onChangeStart={setStart}
            onChangeEnd={setEnd}
          />

          {!result.valid && result.requiresCrossMidnightConfirmation ? (
            <Pressable
              onPress={() => setConfirmMidnight(true)}
              style={styles.midnight}
              accessibilityRole="button"
            >
              <Text style={styles.midnightText}>Ends the next day — tap to confirm.</Text>
            </Pressable>
          ) : null}
          {!result.valid && !result.requiresCrossMidnightConfirmation ? (
            <Text style={styles.error}>{result.reason}</Text>
          ) : null}

          <Pressable
            onPress={save}
            disabled={!result.valid}
            style={[styles.save, !result.valid && styles.saveDisabled]}
            accessibilityRole="button"
          >
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.32)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    padding: spacing.lg,
    gap: spacing.md,
    ...(Platform.OS === "web" ? { boxShadow: "0 12px 26px rgba(0,0,0,0.18)" } : shadow.floating),
  },
  close: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    padding: spacing.xs,
    zIndex: 1,
  },
  closeText: {
    ...typography.heading,
    color: colors.textSecondary,
  },
  heading: {
    ...typography.heading,
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  midnight: {
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.medium,
    padding: spacing.sm,
  },
  midnightText: {
    ...typography.caption,
    color: colors.text,
    textAlign: "center",
  },
  error: {
    ...typography.caption,
    color: "#662C2C",
    textAlign: "center",
  },
  save: {
    backgroundColor: colors.text,
    borderRadius: radius.medium,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  saveDisabled: {
    opacity: 0.4,
  },
  saveText: {
    ...typography.button,
    color: colors.surface,
  },
});
