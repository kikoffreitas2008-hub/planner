import { useEffect, useRef } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { colors, radius, typography } from "@/theme/tokens";

const ITEM_HEIGHT = 30;
const VISIBLE = 3;
const PADDING = ITEM_HEIGHT * ((VISIBLE - 1) / 2);

export type ScrollWheelProps = {
  values: readonly string[];
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel?: string;
};

/**
 * A native-feeling picker wheel (Apple Calendar style), built from a snapping
 * ScrollView so it works on web and native with no extra dependency.
 *
 * The selected value is committed shortly after scrolling settles — driven by
 * `onScroll`, not momentum-end, because a desktop mouse wheel fires neither a
 * drag-end nor a momentum-end event on web.
 */
export function ScrollWheel({ values, value, onChange, accessibilityLabel }: ScrollWheelProps) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    const index = Math.max(0, values.indexOf(value));
    const id = setTimeout(() => ref.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false }), 0);
    return () => clearTimeout(id);
    // Position once. The wheel is remounted (via key) when the edited field changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const offsetY = event.nativeEvent.contentOffset.y;
    const index = Math.min(values.length - 1, Math.max(0, Math.round(offsetY / ITEM_HEIGHT)));
    if (values[index] !== value) onChange(values[index]);
  }

  return (
    <View style={styles.frame} accessibilityLabel={accessibilityLabel} accessibilityRole="adjustable">
      <View pointerEvents="none" style={styles.selection} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScroll}
        onScrollEndDrag={handleScroll}
        contentContainerStyle={{ paddingVertical: PADDING }}
      >
        {values.map((entry) => (
          <View key={entry} style={styles.item}>
            <Text style={[styles.itemText, entry === value && styles.itemTextActive]}>{entry}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: ITEM_HEIGHT * VISIBLE,
    flex: 1,
    overflow: "hidden",
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  itemTextActive: {
    ...typography.heading,
    color: colors.text,
  },
  selection: {
    position: "absolute",
    left: 0,
    right: 0,
    top: PADDING,
    height: ITEM_HEIGHT,
    borderRadius: radius.small,
    backgroundColor: colors.mutedSurface,
  },
});
