import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { NotificationField } from "@/components/agenda/NotificationField";
import { RecurrenceField } from "@/components/agenda/RecurrenceField";
import { RecurrenceScopeDialog } from "@/components/agenda/RecurrenceScopeDialog";
import { ColorDot } from "@/components/ui/ColorDot";
import { DatePickerCalendar } from "@/components/ui/DatePickerCalendar";
import { PickerField } from "@/components/ui/PickerField";
import { TimeRangeWheels } from "@/components/ui/TimeRangeWheels";
import type { AgendaItem } from "@/domain/agenda";
import type { ISODate } from "@/domain/date";
import type { PaletteColor } from "@/domain/entities";
import type { RecurrenceScope } from "@/domain/recurrenceMutation";
import { validateTimeRange } from "@/domain/timeRange";
import { formatClock, formatDMY } from "@/lib/today";
import { colors, palette, radius, spacing, typography, type PaletteKey } from "@/theme/tokens";

const PALETTE_KEYS = Object.keys(palette) as PaletteKey[];

export type AgendaFormResult = {
  item_type: "task" | "event";
  title: string;
  notes: string | null;
  date: ISODate;
  all_day: boolean;
  starts_at: string | null;
  ends_at: string | null;
  color: PaletteColor;
  location: string | null;
  recurrence_rule: string | null;
  notification_offsets: string | null;
};

export type AgendaFormModalProps = {
  visible: boolean;
  defaultDate: ISODate;
  /** Preset type for a fresh item, or the existing agenda item when editing. */
  initial: { mode: "create"; itemType: "task" | "event" } | { mode: "edit"; item: AgendaItem };
  onCancel: () => void;
  onSubmit: (result: AgendaFormResult, scope?: RecurrenceScope) => void;
  onDelete?: (scope?: RecurrenceScope) => void;
};

function clockFromISO(iso: string | null): string {
  return iso ? formatClock(iso) : "";
}

export function AgendaFormModal({
  visible,
  defaultDate,
  initial,
  onCancel,
  onSubmit,
  onDelete,
}: AgendaFormModalProps) {
  const editing = initial.mode === "edit" ? initial.item : null;
  const isSeries = Boolean(editing?.recurrenceRule);

  const [itemType, setItemType] = useState<"task" | "event">(
    editing ? editing.itemKind : initial.mode === "create" ? initial.itemType : "task",
  );
  const [title, setTitle] = useState(editing?.title ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [date, setDate] = useState<string>(editing?.date ?? defaultDate);
  const [allDay, setAllDay] = useState(editing?.allDay ?? false);
  const [start, setStart] = useState(clockFromISO(editing?.startsAt ?? null) || "09:00");
  const [end, setEnd] = useState(clockFromISO(editing?.endsAt ?? null) || "10:00");
  const [color, setColor] = useState<PaletteColor>(editing?.color ?? "blue");
  const [location, setLocation] = useState(
    editing && editing.itemKind === "event" ? (editing.location ?? "") : "",
  );
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(
    editing?.recurrenceRule ?? null,
  );
  const [notificationOffsets, setNotificationOffsets] = useState<string | null>(
    editing?.notificationOffsets && editing.notificationOffsets.length
      ? JSON.stringify([...editing.notificationOffsets])
      : null,
  );
  const [confirmMidnight, setConfirmMidnight] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopePrompt, setScopePrompt] = useState<null | "edit" | "delete">(null);

  const validation = useMemo(() => {
    if (allDay) return { ok: true as const, starts_at: null, ends_at: null };
    const range = validateTimeRange({
      date,
      start,
      end,
      crossesMidnight: confirmMidnight,
    });
    if (range.valid) return { ok: true as const, starts_at: range.startsAt, ends_at: range.endsAt };
    return {
      ok: false as const,
      reason: range.reason,
      needsMidnight: Boolean(range.requiresCrossMidnightConfirmation),
    };
  }, [allDay, date, start, end, confirmMidnight]);

  function buildResult(): AgendaFormResult | null {
    if (!title.trim()) {
      setError("Give it a title.");
      return null;
    }
    if (!validation.ok) {
      setError(validation.reason);
      return null;
    }
    return {
      item_type: itemType,
      title: title.trim(),
      notes: notes.trim() ? notes.trim() : null,
      date: date as ISODate,
      all_day: allDay,
      starts_at: validation.starts_at,
      ends_at: validation.ends_at,
      color,
      location: itemType === "event" && location.trim() ? location.trim() : null,
      recurrence_rule: recurrenceRule,
      notification_offsets: notificationOffsets,
    };
  }

  function submit() {
    const result = buildResult();
    if (!result) return;
    if (editing && isSeries) {
      setScopePrompt("edit");
      return;
    }
    onSubmit(result);
  }

  function requestDelete() {
    if (!onDelete) return;
    if (isSeries) {
      setScopePrompt("delete");
      return;
    }
    onDelete();
  }

  function resolveScope(scope: RecurrenceScope) {
    const mode = scopePrompt;
    setScopePrompt(null);
    if (mode === "delete") {
      onDelete?.(scope);
      return;
    }
    const result = buildResult();
    if (result) onSubmit(result, scope);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>
              {editing ? "Edit" : itemType === "event" ? "New event" : "New to-do"}
            </Text>
            <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <View style={styles.segment}>
              {(["task", "event"] as const).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setItemType(option)}
                  style={[styles.segmentButton, itemType === option && styles.segmentButtonActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: itemType === option }}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      itemType === option && styles.segmentTextActive,
                    ]}
                  >
                    {option === "task" ? "To-do" : "Event"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Field label="Title">
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="What is it?"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
              />
            </Field>

            <PickerField
              label="Date"
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
              <Switch value={allDay} onValueChange={setAllDay} />
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

            {!allDay && !validation.ok && validation.needsMidnight ? (
              <Pressable
                onPress={() => setConfirmMidnight(true)}
                style={styles.midnightConfirm}
                accessibilityRole="button"
              >
                <Text style={styles.midnightText}>
                  Ends the next day — tap to confirm it crosses midnight.
                </Text>
              </Pressable>
            ) : null}

            {itemType === "event" ? (
              <Field label="Location (optional)">
                <TextInput
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Where?"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                />
              </Field>
            ) : null}

            <Field label="Colour">
              <View style={styles.swatches}>
                {PALETTE_KEYS.map((key) => (
                  <Pressable
                    key={key}
                    onPress={() => setColor(key)}
                    style={[styles.swatch, color === key && styles.swatchActive]}
                    accessibilityRole="button"
                    accessibilityLabel={key}
                    accessibilityState={{ selected: color === key }}
                  >
                    <ColorDot color={key} size={22} />
                  </Pressable>
                ))}
              </View>
            </Field>

            <Field label="Notes">
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Anything to remember"
                placeholderTextColor={colors.textSecondary}
                multiline
                style={[styles.input, styles.notesInput]}
              />
            </Field>

            <RecurrenceField value={recurrenceRule} onChange={setRecurrenceRule} />
            <NotificationField value={notificationOffsets} onChange={setNotificationOffsets} />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable onPress={submit} style={styles.saveButton} accessibilityRole="button">
              <Text style={styles.saveText}>Save</Text>
            </Pressable>

            {editing && onDelete ? (
              <Pressable onPress={requestDelete} style={styles.deleteButton} accessibilityRole="button">
                <Text style={styles.deleteText}>Delete</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>

      <RecurrenceScopeDialog
        visible={scopePrompt !== null}
        action={scopePrompt === "delete" ? "delete" : "edit"}
        onPick={resolveScope}
        onCancel={() => setScopePrompt(null)}
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
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
  },
  sheetTitle: {
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
  segment: {
    flexDirection: "row",
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.medium,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: spacing.xs,
    alignItems: "center",
    borderRadius: radius.small,
  },
  segmentButtonActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    ...typography.button,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.text,
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
  notesInput: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  timeField: {
    flex: 1,
  },
  midnightConfirm: {
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.medium,
    padding: spacing.sm,
  },
  midnightText: {
    ...typography.caption,
    color: colors.text,
  },
  swatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  swatch: {
    padding: 3,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchActive: {
    borderColor: colors.text,
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
    marginTop: spacing.xs,
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
