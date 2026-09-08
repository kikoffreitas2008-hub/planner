import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { SwipeableRow } from "@/components/agenda/SwipeableRow";
import { ColorDot } from "@/components/ui/ColorDot";
import { ColorPickerSheet } from "@/components/ui/ColorPickerSheet";
import { GlossyCard } from "@/components/ui/GlossyCard";
import { Touchable } from "@/components/ui/Touchable";
import { remember } from "@/data/repositories";
import { useTable } from "@/data/store";
import { offerUndo } from "@/data/undoBar";
import type { ISODate } from "@/domain/date";
import { colors, palette, spacing, typography, type PaletteKey } from "@/theme/tokens";

export function RememberSection({ date }: { date: ISODate }) {
  const rememberItems = useTable("remember_items");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [colorForId, setColorForId] = useState<string | null>(null);
  const [menuForId, setMenuForId] = useState<string | null>(null);

  const items = useMemo(
    () =>
      Object.values(rememberItems)
        .filter((item) => item.date === date && !item.deleted_at)
        .sort((a, b) => (a.manual_sort_key < b.manual_sort_key ? -1 : 1)),
    [rememberItems, date],
  );

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
        items.map((item) => (
          <SwipeableRow
            key={item.id}
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
                    onLongPress={() => setMenuForId((id) => (id === item.id ? null : item.id))}
                    accessibilityLabel={`Remember: ${item.title || "empty"}`}
                    accessibilityHint="Double tap to edit, or use the actions below to delete"
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
              {menuForId === item.id ? (
                <View style={styles.menu}>
                  <Touchable
                    variant="row"
                    onPress={() => {
                      setMenuForId(null);
                      removeItem(item.id);
                    }}
                    style={styles.menuAction}
                  >
                    <Text style={[styles.menuActionText, { color: palette[item.color].ink }]}>
                      Delete
                    </Text>
                  </Touchable>
                </View>
              ) : null}
            </GlossyCard>
          </SwipeableRow>
        ))
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
  menu: {
    flexDirection: "row",
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.08)",
  },
  menuAction: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
  },
  menuActionText: {
    ...typography.button,
  },
});
