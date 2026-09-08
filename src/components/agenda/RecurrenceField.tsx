import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DatePickerCalendar } from "@/components/ui/DatePickerCalendar";
import { PickerField } from "@/components/ui/PickerField";
import { Touchable } from "@/components/ui/Touchable";
import type { ISODate } from "@/domain/date";
import type { RecurrenceRule } from "@/domain/recurrence";
import { buildRule, describeRule, parseRule, ruleKind, type RuleKind } from "@/lib/recurrence";
import { colors, radius, spacing, typography } from "@/theme/tokens";

const KINDS: { key: RuleKind; label: string }[] = [
  { key: "none", label: "None" },
  { key: "daily", label: "Daily" },
  { key: "weekdays", label: "Weekdays" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "custom", label: "Every N days" },
];

export type RecurrenceFieldProps = {
  value: string | null;
  onChange: (json: string | null) => void;
};

export function RecurrenceField({ value, onChange }: RecurrenceFieldProps) {
  const rule = parseRule(value);
  const [kind, setKind] = useState<RuleKind>(ruleKind(rule));
  const [interval, setInterval] = useState(rule?.interval ?? 2);
  const [end, setEnd] = useState<RecurrenceRule["end"]>(rule?.end ?? { kind: "never" });

  function commit(nextKind: RuleKind, nextInterval: number, nextEnd: RecurrenceRule["end"]) {
    setKind(nextKind);
    setInterval(nextInterval);
    setEnd(nextEnd);
    const built = buildRule(nextKind, nextInterval, nextEnd);
    onChange(built ? JSON.stringify(built) : null);
  }

  return (
    <PickerField label="Repeat" value={describeRule(rule)} placeholder="Does not repeat">
      <View style={styles.body}>
        <View style={styles.chips}>
          {KINDS.map((option) => (
            <Touchable
              key={option.key}
              haptic="selection"
              onPress={() => commit(option.key, interval, end)}
              accessibilityState={{ selected: kind === option.key }}
              style={[styles.chip, kind === option.key && styles.chipOn]}
            >
              <Text style={[styles.chipText, kind === option.key && styles.chipTextOn]}>
                {option.label}
              </Text>
            </Touchable>
          ))}
        </View>

        {kind === "custom" ? (
          <View style={styles.stepRow}>
            <Text style={styles.stepLabel}>Every</Text>
            <Stepper value={interval} min={1} onChange={(next) => commit(kind, next, end)} />
            <Text style={styles.stepLabel}>days</Text>
          </View>
        ) : null}

        {kind !== "none" ? (
          <View style={styles.endBox}>
            <Text style={styles.stepLabel}>Ends</Text>
            <View style={styles.chips}>
              {(["never", "date", "count"] as const).map((endKind) => (
                <Touchable
                  key={endKind}
                  haptic="selection"
                  onPress={() =>
                    commit(
                      kind,
                      interval,
                      endKind === "never"
                        ? { kind: "never" }
                        : endKind === "date"
                          ? { kind: "date", date: end.kind === "date" ? end.date : "" }
                          : { kind: "count", count: end.kind === "count" ? end.count : 10 },
                    )
                  }
                  accessibilityState={{ selected: end.kind === endKind }}
                  style={[styles.chip, end.kind === endKind && styles.chipOn]}
                >
                  <Text style={[styles.chipText, end.kind === endKind && styles.chipTextOn]}>
                    {endKind === "never" ? "Never" : endKind === "date" ? "On date" : "After N"}
                  </Text>
                </Touchable>
              ))}
            </View>

            {end.kind === "date" ? (
              <DatePickerCalendar
                value={/^\d{4}-\d{2}-\d{2}$/.test(end.date) ? (end.date as ISODate) : null}
                onChange={(date) => commit(kind, interval, { kind: "date", date })}
              />
            ) : null}
            {end.kind === "count" ? (
              <View style={styles.stepRow}>
                <Stepper
                  value={end.count}
                  min={1}
                  onChange={(count) => commit(kind, interval, { kind: "count", count })}
                />
                <Text style={styles.stepLabel}>occurrences</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </PickerField>
  );
}

function Stepper({
  value,
  min,
  onChange,
}: {
  value: number;
  min: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Touchable
        onPress={() => onChange(Math.max(min, value - 1))}
        accessibilityLabel="Less"
        style={styles.stepButton}
      >
        <Text style={styles.stepButtonText}>−</Text>
      </Touchable>
      <Text style={styles.stepValue}>{value}</Text>
      <Touchable
        onPress={() => onChange(value + 1)}
        accessibilityLabel="More"
        style={styles.stepButton}
      >
        <Text style={styles.stepButtonText}>+</Text>
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  chipOn: {
    backgroundColor: colors.text,
  },
  chipText: {
    ...typography.caption,
    color: colors.text,
  },
  chipTextOn: {
    color: colors.surface,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stepLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  endBox: {
    gap: spacing.xs,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stepButton: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.mutedSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  stepButtonText: {
    ...typography.heading,
    color: colors.text,
  },
  stepValue: {
    ...typography.body,
    color: colors.text,
    minWidth: 20,
    textAlign: "center",
  },
});
