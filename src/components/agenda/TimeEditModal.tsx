import { useMemo, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { ScrollWheel } from "@/components/ui/ScrollWheel";
import type { AgendaItem } from "@/domain/agenda";
import { validateTimeRange } from "@/domain/timeRange";
import { formatClock } from "@/lib/today";
import { colors, radius, shadow, spacing, typography } from "@/theme/tokens";

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

export type TimeEditModalProps = {
  visible: boolean;
  item: AgendaItem;
  onSave: (startsAt: string, endsAt: string) => void;
  onClose: () => void;
};

function splitClock(iso: string | null, fallback: string): [string, string] {
  const value = iso ? formatClock(iso) : fallback;
  const [h, m] = value.split(":");
  return [h, m];
}

/** The square time picker from edit mode (blueprint/01 section 3.4). */
export function TimeEditModal({ visible, item, onSave, onClose }: TimeEditModalProps) {
  const [startH0, startM0] = splitClock(item.startsAt, "09:00");
  const [endH0, endM0] = splitClock(item.endsAt, "10:00");

  const [field, setField] = useState<"start" | "end">("start");
  const [startH, setStartH] = useState(startH0);
  const [startM, setStartM] = useState(startM0);
  const [endH, setEndH] = useState(endH0);
  const [endM, setEndM] = useState(endM0);
  const [confirmMidnight, setConfirmMidnight] = useState(false);

  const start = `${startH}:${startM}`;
  const end = `${endH}:${endM}`;

  const result = useMemo(
    () => validateTimeRange({ date: item.date, start, end, crossesMidnight: confirmMidnight }),
    [item.date, start, end, confirmMidnight],
  );

  const hour = field === "start" ? startH : endH;
  const minute = field === "start" ? startM : endM;
  const setHour = field === "start" ? setStartH : setEndH;
  const setMinute = field === "start" ? setStartM : setEndM;

  function save() {
    if (result.valid) {
      onSave(result.startsAt, result.endsAt);
      onClose();
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
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

          <View style={styles.toggle}>
            {(["start", "end"] as const).map((option) => (
              <Pressable
                key={option}
                onPress={() => setField(option)}
                style={[styles.toggleButton, field === option && styles.toggleButtonActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: field === option }}
              >
                <Text style={[styles.toggleText, field === option && styles.toggleTextActive]}>
                  {option === "start" ? "Start time" : "End time"}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.preview}>
            {start} – {end}
          </Text>

          <View style={styles.wheels}>
            <ScrollWheel
              key={`hour-${field}`}
              values={HOURS}
              value={hour}
              onChange={setHour}
              accessibilityLabel="Hour"
            />
            <Text style={styles.colon}>:</Text>
            <ScrollWheel
              key={`minute-${field}`}
              values={MINUTES}
              value={minute}
              onChange={setMinute}
              accessibilityLabel="Minute"
            />
          </View>

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
    aspectRatio: 0.92,
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
  toggle: {
    flexDirection: "row",
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.medium,
    padding: 3,
    marginTop: spacing.md,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: "center",
    borderRadius: radius.small,
  },
  toggleButtonActive: {
    backgroundColor: colors.surface,
  },
  toggleText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.text,
  },
  preview: {
    ...typography.heading,
    color: colors.text,
    textAlign: "center",
  },
  wheels: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  colon: {
    ...typography.title,
    color: colors.text,
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
