/* eslint-disable react-hooks/immutability */
// Reanimated's model is to pass SharedValues down and assign `.value` inside
// worklets; this file follows that pattern deliberately, and the rule cannot
// tell a SharedValue prop from a plain mutable prop.
import { useEffect, useMemo, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";

const SPRING = { damping: 22, stiffness: 200 } as const;

type Indexed = Record<string, number>;

function indexMap(ids: readonly string[]): Indexed {
  const map: Indexed = {};
  ids.forEach((id, index) => {
    map[id] = index;
  });
  return map;
}

function moveIndex(map: Indexed, from: number, to: number): Indexed {
  "worklet";
  const next: Indexed = {};
  for (const key in map) {
    const value = map[key];
    if (value === from) next[key] = to;
    else if (from < to && value > from && value <= to) next[key] = value - 1;
    else if (to < from && value >= to && value < from) next[key] = value + 1;
    else next[key] = value;
  }
  return next;
}

export type DraggableColumnProps<T extends { id: string }> = {
  data: readonly T[];
  rowHeight: number;
  renderItem: (item: T) => ReactNode;
  onReorder: (orderedIds: string[]) => void;
  enabled?: boolean;
};

/**
 * A vertical drag-to-reorder list. Long-press a row to pick it up. On drop it
 * calls `onReorder` with the new id order; the caller writes the fractional
 * keys (blueprint/01 §4.4).
 */
export function DraggableColumn<T extends { id: string }>({
  data,
  rowHeight,
  renderItem,
  onReorder,
  enabled = true,
}: DraggableColumnProps<T>) {
  const ids = data.map((item) => item.id);
  const idsKey = ids.join("|");

  const positions = useSharedValue<Indexed>(indexMap(ids));
  const activeId = useSharedValue<string | null>(null);
  const activeStartIndex = useSharedValue(0);
  const activeOffset = useSharedValue(0);

  useEffect(() => {
    positions.value = indexMap(idsKey ? idsKey.split("|") : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  function commit() {
    const order = [...ids].sort((a, b) => positions.value[a] - positions.value[b]);
    onReorder(order);
  }

  return (
    <View style={{ height: data.length * rowHeight }}>
      {data.map((item) => (
        <Row
          key={item.id}
          id={item.id}
          count={data.length}
          rowHeight={rowHeight}
          enabled={enabled}
          positions={positions}
          activeId={activeId}
          activeStartIndex={activeStartIndex}
          activeOffset={activeOffset}
          onCommit={commit}
        >
          {renderItem(item)}
        </Row>
      ))}
    </View>
  );
}

type RowProps = {
  id: string;
  count: number;
  rowHeight: number;
  enabled: boolean;
  positions: SharedValue<Indexed>;
  activeId: SharedValue<string | null>;
  activeStartIndex: SharedValue<number>;
  activeOffset: SharedValue<number>;
  onCommit: () => void;
  children: ReactNode;
};

function Row({
  id,
  count,
  rowHeight,
  enabled,
  positions,
  activeId,
  activeStartIndex,
  activeOffset,
  onCommit,
  children,
}: RowProps) {
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .activateAfterLongPress(180)
        .onStart(() => {
          activeId.value = id;
          activeStartIndex.value = positions.value[id];
          activeOffset.value = positions.value[id] * rowHeight;
        })
        .onUpdate((event) => {
          activeOffset.value = activeStartIndex.value * rowHeight + event.translationY;
          const target = Math.max(
            0,
            Math.min(count - 1, Math.round(activeOffset.value / rowHeight)),
          );
          const current = positions.value[id];
          if (target !== current) {
            positions.value = moveIndex(positions.value, current, target);
          }
        })
        .onEnd(() => {
          activeOffset.value = positions.value[id] * rowHeight;
          activeId.value = null;
          runOnJS(onCommit)();
        }),
    [id, count, rowHeight, enabled, positions, activeId, activeStartIndex, activeOffset, onCommit],
  );

  const style = useAnimatedStyle(() => {
    const isActive = activeId.value === id;
    return {
      position: "absolute",
      left: 0,
      right: 0,
      top: isActive
        ? activeOffset.value
        : withSpring(positions.value[id] * rowHeight, SPRING),
      zIndex: isActive ? 20 : 0,
      transform: [{ scale: withSpring(isActive ? 1.02 : 1, SPRING) }],
    };
  });

  return (
    <Animated.View style={[styles.row, { height: rowHeight }, style]}>
      <GestureDetector gesture={gesture}>
        <View style={styles.fill}>{children}</View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    justifyContent: "center",
  },
  fill: {
    flex: 1,
  },
});
