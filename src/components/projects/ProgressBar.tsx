import { StyleSheet, Text, View } from "react-native";

import type { ProjectProgress } from "@/domain/progress";
import { formatDuration } from "@/domain/duration";
import { colors, radius, spacing, typography } from "@/theme/tokens";

export type ProgressBarProps = {
  progress: ProjectProgress;
  mode: "items" | "time";
  /** On a project card the label sits above; in a list it sits inline. */
  tone?: "dark" | "ink";
  inkColor?: string;
};

export function ProgressBar({ progress, mode, tone = "dark", inkColor }: ProgressBarProps) {
  const color = tone === "ink" && inkColor ? inkColor : colors.text;
  const pct = Math.round(progress.ratio * 100);
  const label =
    mode === "time"
      ? `${formatDuration(progress.completed)} / ${formatDuration(progress.total)}`
      : `${progress.completed} / ${progress.total}`;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={[styles.label, { color }]}>{label}</Text>
        <Text style={[styles.pct, { color }]}>{pct}%</Text>
      </View>
      <View style={[styles.track, { borderColor: color }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xxs,
    width: "100%",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    ...typography.caption,
  },
  pct: {
    ...typography.caption,
  },
  track: {
    height: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    opacity: 0.9,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.pill,
  },
});
