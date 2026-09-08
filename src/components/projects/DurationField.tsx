import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { PopIn } from "@/components/ui/PopIn";
import { ScrollWheel } from "@/components/ui/ScrollWheel";
import { Touchable } from "@/components/ui/Touchable";
import { formatDuration } from "@/domain/duration";
import { colors, radius, shadow, spacing, typography } from "@/theme/tokens";

export type DurationFieldProps = {
  minutes: number | null;
  onChange: (minutes: number | null) => void;
};

const HOURS = Array.from({ length: 24 }, (_, index) => String(index));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

/**
 * The task's estimated time. A button showing the current estimate that opens
 * a wheel picker (hours + minutes) in a pop-up. Unlike the old free-text
 * field, the value is committed the moment "Done" is tapped — so it is
 * already in place when the surrounding sheet is saved.
 */
export function DurationField({ minutes, onChange }: DurationFieldProps) {
  const [open, setOpen] = useState(false);
  const [h, setH] = useState(0);
  const [m, setM] = useState(0);

  function openPicker() {
    const value = minutes ?? 0;
    setH(Math.min(23, Math.floor(value / 60)));
    setM(value % 60);
    setOpen(true);
  }

  function done() {
    const total = h * 60 + m;
    onChange(total === 0 ? null : total);
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setOpen(false);
  }

  return (
    <>
      <Touchable
        variant="row"
        onPress={openPicker}
        accessibilityLabel={
          minutes === null ? "Set estimated time" : `Estimated time: ${formatDuration(minutes)}`
        }
        style={styles.button}
      >
        <Text style={[styles.value, minutes === null && styles.placeholder]}>
          {minutes === null ? "Set time" : formatDuration(minutes)}
        </Text>
      </Touchable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Cancel"
            onPress={() => setOpen(false)}
          />
          <PopIn style={styles.card}>
            <Text style={styles.title}>Estimated time</Text>
            <View style={styles.wheels}>
              <View style={styles.column}>
                <ScrollWheel
                  key={`h-${open}`}
                  values={HOURS}
                  value={String(h)}
                  onChange={(next) => setH(Number(next))}
                  accessibilityLabel="Hours"
                />
                <Text style={styles.unit}>h</Text>
              </View>
              <View style={styles.column}>
                <ScrollWheel
                  key={`m-${open}`}
                  values={MINUTES}
                  value={String(m).padStart(2, "0")}
                  onChange={(next) => setM(Number(next))}
                  accessibilityLabel="Minutes"
                />
                <Text style={styles.unit}>min</Text>
              </View>
            </View>
            <View style={styles.actions}>
              <Touchable variant="row" onPress={clear} style={styles.action}>
                <Text style={styles.actionText}>Clear</Text>
              </Touchable>
              <Touchable onPress={done} haptic="success" style={[styles.action, styles.done]}>
                <Text style={[styles.actionText, styles.doneText]}>Done</Text>
              </Touchable>
            </View>
          </PopIn>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.medium,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 96,
  },
  value: {
    ...typography.body,
    color: colors.text,
  },
  placeholder: {
    color: colors.textSecondary,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.32)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    padding: spacing.lg,
    gap: spacing.md,
    ...(Platform.OS === "web" ? { boxShadow: "0 12px 26px rgba(0,0,0,0.18)" } : shadow.floating),
  },
  title: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  wheels: {
    height: 90,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  column: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
  },
  unit: {
    ...typography.body,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: spacing.sm,
  },
  action: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.medium,
  },
  actionText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  done: {
    backgroundColor: colors.text,
  },
  doneText: {
    color: colors.surface,
  },
});
