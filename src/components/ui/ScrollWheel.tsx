import { useEffect, useRef } from "react";
import {
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
} from "react-native";

import { colors, radius, typography } from "@/theme/tokens";

const ITEM_HEIGHT = 40;
const VISIBLE = 5;

export type ScrollWheelProps = {
  values: readonly string[];
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel?: string;
};

/**
 * A native-feeling picker wheel (Apple Calendar style), built from a snapping
 * ScrollView so it works on web and native with no extra dependency.
 */
export function ScrollWheel({ values, value, onChange, accessibilityLabel }: ScrollWheelProps) {
  const ref = useRef<ScrollView>(null);
  const index = Math.max(0, values.indexOf(value));

  useEffect(() => {
    ref.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false });
    // Re-align only when the selected value changes from outside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const raw = Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT);
    const clamped = Math.min(values.length - 1, Math.max(0, raw));
    if (values[clamped] !== value) onChange(values[clamped]);
  }

  return (
    <View
      style={styles.frame}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
    >
      <View pointerEvents="none" style={styles.selection} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleEnd}
        onScrollEndDrag={handleEnd}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * ((VISIBLE - 1) / 2) }}
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
    ...typography.heading,
    color: colors.textSecondary,
  },
  itemTextActive: {
    color: colors.text,
  },
  selection: {
    position: "absolute",
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * ((VISIBLE - 1) / 2),
    height: ITEM_HEIGHT,
    borderRadius: radius.small,
    backgroundColor: colors.mutedSurface,
  },
});
