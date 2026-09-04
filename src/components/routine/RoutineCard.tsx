import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { SwipeableRow } from "@/components/agenda/SwipeableRow";
import { DraggableColumn } from "@/components/projects/DraggableColumn";
import { PlatformIcon } from "@/components/ui/PlatformIcon";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { routine } from "@/data/repositories";
import { useTable } from "@/data/store";
import { offerUndo } from "@/data/undoBar";
import { colors, radius, spacing, typography } from "@/theme/tokens";

/**
 * The Morning Routine: a reusable checklist. State persists until Reset is
 * tapped — nothing clears it at midnight (blueprint/01 section 3.7).
 *
 * `addSignal` increments when the `+` menu picks "New routine item"; it just
 * focuses the input.
 */
export function RoutineCard({ addSignal }: { addSignal: number }) {
  const routineLists = useTable("routine_lists");
  const routineItems = useTable("routine_items");
  const inputRef = useRef<TextInput>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    routine.ensureDefaultList();
  }, []);

  useEffect(() => {
    if (addSignal > 0) inputRef.current?.focus();
  }, [addSignal]);

  const list = useMemo(
    () => Object.values(routineLists).find((entry) => !entry.deleted_at && !entry.archived_at) ?? null,
    [routineLists],
  );

  const items = useMemo(() => {
    if (!list) return [];
    return Object.values(routineItems)
      .filter((item) => item.routine_list_id === list.id && !item.deleted_at)
      .sort((a, b) => (a.manual_sort_key < b.manual_sort_key ? -1 : 1));
  }, [routineItems, list]);

  const anyChecked = items.some((item) => item.completed_at);

  function submitDraft() {
    const title = draft.trim();
    if (!title) return;
    const target = list ?? routine.ensureDefaultList();
    routine.addItem(target.id, title);
    setDraft("");
    inputRef.current?.focus();
  }

  function remove(id: string) {
    routine.softDeleteItem(id);
    offerUndo("Item deleted", () => routine.restoreItem(id), () => {});
  }

  return (
    <SurfaceCard>
      <View style={styles.header}>
        <Text style={styles.title}>Morning Routine</Text>
        <Pressable
          onPress={() => list && routine.resetList(list.id)}
          disabled={!anyChecked}
          accessibilityRole="button"
          style={[styles.reset, !anyChecked && styles.resetDisabled]}
        >
          <Text style={styles.resetText}>Reset</Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        <DraggableColumn
          data={items}
          estimatedRowHeight={44}
          onReorder={(orderedIds) => routine.applyOrder(orderedIds)}
          renderItem={(item) => (
            <SwipeableRow
              onSwipeRight={() => routine.setChecked(item.id, !item.completed_at)}
              onSwipeLeft={() => remove(item.id)}
              rightLabel={item.completed_at ? "Uncheck" : "Check"}
            >
              <View style={styles.row}>
                <Pressable
                  onPress={() => routine.setChecked(item.id, !item.completed_at)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: Boolean(item.completed_at) }}
                  accessibilityLabel={item.title}
                  hitSlop={8}
                >
                  <PlatformIcon
                    sf={item.completed_at ? "checkmark.circle.fill" : "circle"}
                    ion={item.completed_at ? "checkmark-circle" : "ellipse-outline"}
                    size={24}
                    color={item.completed_at ? colors.text : colors.textSecondary}
                  />
                </Pressable>
                <Text style={[styles.itemText, item.completed_at && styles.itemTextDone]}>
                  {item.title}
                </Text>
              </View>
            </SwipeableRow>
          )}
        />

        <View style={styles.row}>
          <PlatformIcon
            sf="plus.circle"
            ion="add-circle-outline"
            size={24}
            color={colors.textSecondary}
          />
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={submitDraft}
            submitBehavior="submit"
            returnKeyType="done"
            placeholder="Add an item"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
          />
          {draft.trim() ? (
            <Pressable onPress={submitDraft} accessibilityRole="button" style={styles.add}>
              <Text style={styles.addText}>Add</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  reset: {
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  resetDisabled: {
    opacity: 0.4,
  },
  resetText: {
    ...typography.button,
    color: colors.text,
  },
  list: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  itemText: {
    ...typography.body,
    color: colors.text,
    flexShrink: 1,
  },
  itemTextDone: {
    textDecorationLine: "line-through",
    color: colors.textSecondary,
  },
  input: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    paddingVertical: spacing.xxs,
  },
  add: {
    backgroundColor: colors.text,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
  },
  addText: {
    ...typography.button,
    color: colors.surface,
  },
});

