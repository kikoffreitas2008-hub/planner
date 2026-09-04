import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { formatDuration, parseDuration } from "@/domain/duration";
import { colors, radius, spacing, typography } from "@/theme/tokens";

export type DurationFieldProps = {
  minutes: number | null;
  onChange: (minutes: number | null) => void;
};

/** Accepts `90`, `90min`, `1h30`, `1:30` and normalises to minutes (blueprint/01 §4.5). */
export function DurationField({ minutes, onChange }: DurationFieldProps) {
  const [text, setText] = useState(minutes === null ? "" : formatDuration(minutes));
  const [error, setError] = useState(false);

  function commit() {
    const trimmed = text.trim();
    if (!trimmed) {
      setError(false);
      onChange(null);
      return;
    }
    try {
      const parsed = parseDuration(trimmed);
      setError(false);
      onChange(parsed);
      setText(parsed === null ? "" : formatDuration(parsed));
    } catch {
      setError(true);
    }
  }

  return (
    <View style={styles.wrap}>
      <TextInput
        value={text}
        onChangeText={setText}
        onEndEditing={commit}
        onSubmitEditing={commit}
        placeholder="e.g. 1h30"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        style={[styles.input, error && styles.inputError]}
      />
      {error ? <Text style={styles.error}>Try 90, 90min, 1h30 or 1:30</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xxs,
  },
  input: {
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.medium,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minWidth: 96,
  },
  inputError: {
    borderColor: "#662C2C",
  },
  error: {
    ...typography.caption,
    color: "#662C2C",
  },
});
