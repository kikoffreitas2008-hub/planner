import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { SwipeableRow } from "@/components/agenda/SwipeableRow";
import { DraggableColumn } from "@/components/projects/DraggableColumn";
import { ColorDot } from "@/components/ui/ColorDot";
import { ColorPickerSheet } from "@/components/ui/ColorPickerSheet";
import { GlossyCard } from "@/components/ui/GlossyCard";
import { Touchable } from "@/components/ui/Touchable";
import { remember } from "@/data/repositories";
import { useTable } from "@/data/store";
import { offerUndo } from "@/data/undoBar";
import { visibleRememberItems } from "@/domain/remember";
import {
  colors,
  layoutTokens,
  palette,
  spacing,
  typography,
  type PaletteKey,
} from "@/theme/tokens";

/** Standing reminders: shown on every day until deleted, not tied to a date. */
export function RememberSection() {
  const rememberItems = useTable("remember_items");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [colorForId, setColorForId] = useState<string | null>(null);

  const items = useMemo(() => visibleRememberItems(rememberItems), [rememberItems]);

  // A freshly created blank card opens straight into edit mode.
  const blankId = items.find((item) => !item.title.trim())?.id ?? null;
  const activeEditId = editingId ?? blankId;

  function commit(id: string, text: string) {
    const title = text.trim();
    if (title) remember.update(id, { title });
    else remember.softDelete(id);
    setEditingId(null);
  }

  function removeItem(id: string) {
    remember.softDelete(id);
    offerUndo("Item deleted", () => remember.restore(id), () => {});
  }

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Remember</Text>

      {items.length === 0 ? (
        <Text style={styles.empty}>Nothing to remember for this day.</Text>
      ) : (
        // Rows are stacked absolutely by the column, so the gap between cards
        // lives in each row; the negative margin cancels the last row's copy.
        <View style={styles.list}>
          <DraggableColumn
            data={items}
            enabled={!activeEditId}
            dragMode="longPress"
            estimatedRowHeight={layoutTokens.rememberHeight + spacing.sm}
            onReorder={(orderedIds) => remember.applyOrder(orderedIds)}
            renderItem={(item) => (
              <View style={styles.rowGap}>
                <SwipeableRow
                  onSwipeRight={() => setEditingId(item.id)}
                  onSwipeLeft={() => removeItem(item.id)}
                  rightLabel="Edit"
                >
                  <GlossyCard color={item.color} size="remember">
                    <View style={styles.row}>
                      {activeEditId === item.id ? (
                        <TextInput
                          defaultValue={item.title}
                          onSubmitEditing={(event) => commit(item.id, event.nativeEvent.text)}
                          onEndEditing={(event) => commit(item.id, event.nativeEvent.text)}
                          returnKeyType="done"
                          placeholder="One line to remember"
                          placeholderTextColor={palette[item.color].ink}
                          style={[styles.input, { color: palette[item.color].ink }]}
                          autoFocus
                        />
                      ) : (
                        <Touchable
                          variant="row"
                          style={styles.textWrap}
                          onPress={() => setEditingId(item.id)}
                          // Holding a card is only for reordering. Having a
                          // long-press handler makes Pressable skip `onPress`
                          // on release, so lifting a held card does not open
                          // the editor.
                          onLongPress={() => {}}
                          accessibilityLabel={`Remember: ${item.title || "empty"}`}
                          accessibilityHint="Double tap to edit. Swipe left to delete."
                        >
                          <Text
                            style={[styles.text, { color: palette[item.color].ink }]}
                            numberOfLines={1}
                          >
                            {item.title || "…"}
                          </Text>
                        </Touchable>
                      )}
                      <ColorDot
                        color={item.color}
                        onPress={() => setColorForId(item.id)}
                        accessibilityLabel={`Change colour (currently ${item.color})`}
                      />
                    </View>
                  </GlossyCard>
                </SwipeableRow>
              </View>
            )}
          />
        </View>
      )}

      {colorForId ? (
        <ColorPickerSheet
          visible
          value={items.find((item) => item.id === colorForId)?.color ?? "yellow"}
          onPick={(color: PaletteKey) => remember.update(colorForId, { color })}
          onClose={() => setColorForId(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  heading: {
    ...typography.heading,
    color: colors.text,
  },
  empty: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  textWrap: {
    flex: 1,
  },
  text: {
    ...typography.body,
  },
  input: {
    ...typography.body,
    flex: 1,
    paddingVertical: 0,
  },
  list: {
    marginBottom: -spacing.sm,
  },
  rowGap: {
    paddingBottom: spacing.sm,
  },
});
