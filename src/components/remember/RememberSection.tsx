import { useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";

import { SwipeableRow } from "@/components/agenda/SwipeableRow";
import { DraggableColumn } from "@/components/projects/DraggableColumn";
import { ColorDot } from "@/components/ui/ColorDot";
import { ColorPickerSheet } from "@/components/ui/ColorPickerSheet";
import { GlossyCard } from "@/components/ui/GlossyCard";
import { Touchable } from "@/components/ui/Touchable";
import { remember } from "@/data/repositories";
import { useTable } from "@/data/store";
import { offerUndo } from "@/data/undoBar";
import type { RememberItem } from "@/domain/entities";
import { visibleRememberItems } from "@/domain/remember";
import { releaseKeyboard } from "@/lib/keyboardPrime";
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

  // A drag that fails (moved before the long-press hold completed) still
  // ends in a tap-like release; without this the row falls through to
  // opening the editor, which reads as "reordering edited my reminder".
  // Keyed per id and cleared on read, so a real tap right after is unaffected.
  const suppressTapUntil = useRef<Record<string, number>>({});

  function commit(id: string, text: string) {
    const title = text.trim();
    if (!title) remember.softDelete(id);
    else if (title !== rememberItems[id]?.title) remember.update(id, { title });
    setEditingId(null);
  }

  /** Escape: discard whatever was typed instead of saving it. */
  function cancelEdit(id: string, hadTitle: boolean) {
    if (!hadTitle) remember.softDelete(id);
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
            onDragAttempt={(id) => {
              suppressTapUntil.current[id] = Date.now() + 400;
            }}
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
                        <RememberInput
                          item={item}
                          onCommit={(text) => commit(item.id, text)}
                          onCancel={() => cancelEdit(item.id, !!item.title.trim())}
                        />
                      ) : (
                        <Touchable
                          variant="row"
                          style={styles.textWrap}
                          onPress={() => {
                            // A drag that failed (moved before the hold
                            // completed) still releases like a tap; don't
                            // let it fall through to opening the editor.
                            if ((suppressTapUntil.current[item.id] ?? 0) > Date.now()) return;
                            setEditingId(item.id);
                          }}
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

type RememberInputProps = {
  item: RememberItem;
  onCommit: (text: string) => void;
  onCancel: () => void;
};

/**
 * The inline editor. It saves on Enter *and* on blur — tapping outside the
 * iPhone keyboard only blurs, and react-native-web never fires onEndEditing,
 * so blur is the one event every platform delivers. Each edit settles once:
 * Enter is followed by a blur, and Escape must not be undone by its blur.
 */
function RememberInput({ item, onCommit, onCancel }: RememberInputProps) {
  const ref = useRef<TextInput>(null);
  const settled = useRef(false);
  // Native blur events carry no text, so track it as it is typed.
  const text = useRef(item.title);
  const ink = palette[item.color].ink;

  useEffect(() => {
    ref.current?.focus();
    // The keyboard was raised by a stand-in during the tap; focus is ours now.
    releaseKeyboard();
  }, []);

  function settle(action: () => void) {
    if (settled.current) return;
    settled.current = true;
    action();
  }

  return (
    <TextInput
      ref={ref}
      defaultValue={item.title}
      onChangeText={(next) => {
        text.current = next;
      }}
      onSubmitEditing={(event) => settle(() => onCommit(event.nativeEvent.text))}
      onBlur={() => {
        // Switching to another window blurs too; the edit is still open when
        // the user comes back, so that is not a "tap outside".
        if (Platform.OS === "web" && !document.hasFocus()) return;
        settle(() => onCommit(text.current));
      }}
      onKeyPress={(event) => {
        if (event.nativeEvent.key === "Escape") settle(onCancel);
      }}
      returnKeyType="done"
      placeholder="One line to remember"
      placeholderTextColor={ink}
      style={[styles.input, { color: ink }]}
      autoFocus
    />
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
