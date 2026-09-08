import { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { DurationField } from "@/components/projects/DurationField";
import {
  ImportancePicker,
  importanceColor,
  importanceLabel,
} from "@/components/projects/ImportancePicker";
import { DatePickerCalendar } from "@/components/ui/DatePickerCalendar";
import { PickerField } from "@/components/ui/PickerField";
import { TimeRangeWheels } from "@/components/ui/TimeRangeWheels";
import { Touchable } from "@/components/ui/Touchable";
import { projectItems } from "@/data/repositories";
import { offerUndo } from "@/data/undoBar";
import type { ISODate } from "@/domain/date";
import type { ProjectItem } from "@/domain/entities";
import { validateTimeRange } from "@/domain/timeRange";
import { formatClock, formatDMY } from "@/lib/today";
import { colors, radius, shadow, spacing, typography } from "@/theme/tokens";

export type ProjectItemSheetProps = {
  item: ProjectItem;
  onClose: () => void;
};

export function ProjectItemSheet({ item, onClose }: ProjectItemSheetProps) {
  const [title, setTitle] = useState(item.title);
  const [notes, setNotes] = useState(item.notes ?? "");
  const [importance, setImportance] = useState<ProjectItem["importance"]>(item.importance);
  const [estimate, setEstimate] = useState<number | null>(item.estimated_minutes);
  const [importanceOpen, setImportanceOpen] = useState(false);

  const [scheduled, setScheduled] = useState(Boolean(item.scheduled_date));
  const [date, setDate] = useState(item.scheduled_date ?? "");
  const [allDay, setAllDay] = useState(item.scheduled_all_day);
  const [start, setStart] = useState(
    item.scheduled_starts_at ? formatClock(item.scheduled_starts_at) : "09:00",
  );
  const [end, setEnd] = useState(
    item.scheduled_ends_at ? formatClock(item.scheduled_ends_at) : "10:00",
  );
  const [confirmMidnight, setConfirmMidnight] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schedule = useMemo(() => {
    if (!scheduled) return { ok: true as const, value: null };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { ok: false as const, reason: "Enter a date as YYYY-MM-DD." };
    }
    if (allDay) {
      return {
        ok: true as const,
        value: {
          scheduled_date: date as ISODate,
          scheduled_all_day: true,
          scheduled_starts_at: null,
          scheduled_ends_at: null,
        },
      };
    }
    const range = validateTimeRange({ date, start, end, crossesMidnight: confirmMidnight });
    if (!range.valid) {
      return {
        ok: false as const,
        reason: range.reason,
        needsMidnight: Boolean(range.requiresCrossMidnightConfirmation),
      };
    }
    return {
      ok: true as const,
      value: {
        scheduled_date: date as ISODate,
        scheduled_all_day: false,
        scheduled_starts_at: range.startsAt,
        scheduled_ends_at: range.endsAt,
      },
    };
  }, [scheduled, date, allDay, start, end, confirmMidnight]);

  function save() {
    if (!title.trim()) {
      setError("Give it a title.");
      return;
    }
    if (!schedule.ok) {
      setError(schedule.reason);
      return;
    }
    projectItems.update(item.id, {
      title: title.trim(),
      notes: notes.trim() ? notes.trim() : null,
    });
    projectItems.setImportance(item.id, importance);
    projectItems.setEstimate(item.id, estimate);
    if (schedule.value) projectItems.schedule(item.id, schedule.value);
    else projectItems.unschedule(item.id);
    onClose();
  }

  function remove() {
    projectItems.softDelete(item.id);
    offerUndo("Item deleted", () => projectItems.restore(item.id), () => projectItems.purge(item.id));
    onClose();
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close" onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Item</Text>
            <Touchable onPress={onClose} accessibilityLabel="Close">
              <Text style={styles.close}>✕</Text>
            </Touchable>
          </View>

          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Field label="Name">
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="What needs doing?"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
              />
            </Field>

            <View style={styles.inlineRow}>
              <Field label="Importance" style={styles.inlineField}>
                <Touchable
                  variant="row"
                  onPress={() => setImportanceOpen(true)}
                  style={styles.pickerButton}
                >
                  <Text style={[styles.pickerText, { color: importanceColor(importance) }]}>
                    {importanceLabel(importance)}
                  </Text>
                </Touchable>
              </Field>
              <Field label="Time" style={styles.inlineField}>
                <DurationField minutes={estimate} onChange={setEstimate} />
              </Field>
            </View>

            <Field label="Notes">
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Anything useful"
                placeholderTextColor={colors.textSecondary}
                multiline
                style={[styles.input, styles.notes]}
              />
            </Field>

            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Schedule</Text>
              <Switch accessibilityLabel="Schedule" value={scheduled} onValueChange={setScheduled} />
            </View>

            {scheduled ? (
              <View style={styles.scheduleBox}>
                <PickerField
                  label="Day"
                  value={/^\d{4}-\d{2}-\d{2}$/.test(date) ? formatDMY(date as ISODate) : ""}
                  placeholder="Choose a day"
                >
                  <DatePickerCalendar
                    value={/^\d{4}-\d{2}-\d{2}$/.test(date) ? (date as ISODate) : null}
                    onChange={setDate}
                  />
                </PickerField>
                <View style={styles.switchRow}>
                  <Text style={styles.fieldLabel}>All day</Text>
                  <Switch accessibilityLabel="All day" value={allDay} onValueChange={setAllDay} />
                </View>
                {!allDay ? (
                  <PickerField label="Time" value={`${start} – ${end}`}>
                    <TimeRangeWheels
                      start={start}
                      end={end}
                      onChangeStart={setStart}
                      onChangeEnd={setEnd}
                    />
                  </PickerField>
                ) : null}
                {!schedule.ok && schedule.needsMidnight ? (
                  <Touchable
                    variant="row"
                    onPress={() => setConfirmMidnight(true)}
                    style={styles.midnight}
                  >
                    <Text style={styles.midnightText}>Ends the next day — tap to confirm.</Text>
                  </Touchable>
                ) : null}
              </View>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Touchable onPress={save} haptic="success" style={styles.saveButton}>
              <Text style={styles.saveText}>Save</Text>
            </Touchable>
            <Touchable onPress={remove} haptic="warning" style={styles.deleteButton}>
              <Text style={styles.deleteText}>Delete item</Text>
            </Touchable>
          </ScrollView>
        </View>
      </View>

      <ImportancePicker
        visible={importanceOpen}
        value={importance}
        onPick={setImportance}
        onClose={() => setImportanceOpen(false)}
      />
    </Modal>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
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
    maxHeight: "92%",
    paddingBottom: spacing.xl,
    ...(Platform.OS === "web" ? { boxShadow: "0 -8px 26px rgba(0,0,0,0.16)" } : shadow.floating),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  close: {
    ...typography.heading,
    color: colors.textSecondary,
  },
  form: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  field: {
    gap: spacing.xxs,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.textSecondary,
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
  notes: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  inlineRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  inlineField: {
    flex: 1,
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.medium,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pickerText: {
    ...typography.body,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scheduleBox: {
    gap: spacing.sm,
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.medium,
    padding: spacing.sm,
  },
  midnight: {
    backgroundColor: colors.surface,
    borderRadius: radius.small,
    padding: spacing.sm,
  },
  midnightText: {
    ...typography.caption,
    color: colors.text,
  },
  error: {
    ...typography.caption,
    color: "#662C2C",
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
  deleteButton: {
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  deleteText: {
    ...typography.button,
    color: "#662C2C",
  },
});
