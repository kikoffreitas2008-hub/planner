/* eslint-disable react-hooks/immutability */
// Reanimated's model is to pass SharedValues down and assign `.value` inside
// worklets; this file follows that pattern deliberately, and the rule cannot
// tell a SharedValue prop from a plain mutable prop.
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";

import { PlatformIcon } from "@/components/ui/PlatformIcon";
import { colors, spacing } from "@/theme/tokens";

const SPRING = { damping: 22, stiffness: 200 } as const;
const HANDLE_WIDTH = 40;

type Indexed = Record<string, number>;
type Heights = Record<string, number>;

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
  renderItem: (item: T) => ReactNode;
  onReorder: (orderedIds: string[]) => void;
  enabled?: boolean;
  /** Used for layout before rows have measured themselves. */
  estimatedRowHeight?: number;
};

/**
 * A vertical drag-to-reorder list that measures its own rows, so it works with
 * fixed and variable heights alike. Each row carries a grip handle (three
 * lines) on the left; press and drag it — no long-press. On drop it calls
 * `onReorder` with the new id order (blueprint/01 §4.4).
 */
export function DraggableColumn<T extends { id: string }>({
  data,
  renderItem,
  onReorder,
  enabled = true,
  estimatedRowHeight = 64,
}: DraggableColumnProps<T>) {
  const idsKey = data.map((item) => item.id).join("|");
  const ids = useMemo(() => (idsKey ? idsKey.split("|") : []), [idsKey]);

  const positions = useSharedValue<Indexed>(indexMap(ids));
  const heights = useSharedValue<Heights>({});
  const activeId = useSharedValue<string | null>(null);
  const activeTop = useSharedValue(0);
  const startTop = useSharedValue(0);

  const [totalHeight, setTotalHeight] = useState(0);

  useEffect(() => {
    positions.value = indexMap(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const measure = useCallback(
    (id: string, height: number) => {
      if (Math.abs((heights.value[id] ?? 0) - height) < 0.5) return;
      heights.value = { ...heights.value, [id]: height };
      setTotalHeight(ids.reduce((sum, entry) => sum + (heights.value[entry] ?? 0), 0));
    },
    [heights, ids],
  );

  const commit = useCallback(() => {
    const order = [...ids].sort((a, b) => positions.value[a] - positions.value[b]);
    onReorder(order);
  }, [ids, onReorder, positions]);

  return (
    <View style={{ height: totalHeight || ids.length * estimatedRowHeight }}>
      {data.map((item) => (
        <Row
          key={item.id}
          id={item.id}
          ids={ids}
          enabled={enabled}
          estimate={estimatedRowHeight}
          positions={positions}
          heights={heights}
          activeId={activeId}
          activeTop={activeTop}
          startTop={startTop}
          onMeasure={measure}
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
  ids: readonly string[];
  enabled: boolean;
  estimate: number;
  positions: SharedValue<Indexed>;
  heights: SharedValue<Heights>;
  activeId: SharedValue<string | null>;
  activeTop: SharedValue<number>;
  startTop: SharedValue<number>;
  onMeasure: (id: string, height: number) => void;
  onCommit: () => void;
  children: ReactNode;
};

function Row({
  id,
  ids,
  enabled,
  estimate,
  positions,
  heights,
  activeId,
  activeTop,
  startTop,
  onMeasure,
  onCommit,
  children,
}: RowProps) {
  function topOf(targetId: string): number {
    "worklet";
    const myPos = positions.value[targetId];
    let top = 0;
    for (const other of ids) {
      if (positions.value[other] < myPos) top += heights.value[other] ?? estimate;
    }
    return top;
  }

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .activeOffsetY([-4, 4])
        .failOffsetX([-16, 16])
        .onStart(() => {
          const top = topOf(id);
          startTop.value = top;
          activeTop.value = top;
          activeId.value = id;
        })
        .onUpdate((event) => {
          activeTop.value = startTop.value + event.translationY;
          const mid = activeTop.value + (heights.value[id] ?? estimate) / 2;
          const sorted = [...ids].sort((a, b) => positions.value[a] - positions.value[b]);
          let acc = 0;
          let target = sorted.length - 1;
          for (let i = 0; i < sorted.length; i += 1) {
            const rowHeight = heights.value[sorted[i]] ?? estimate;
            if (mid < acc + rowHeight) {
              target = i;
              break;
            }
            acc += rowHeight;
          }
          const current = positions.value[id];
          if (target !== current) positions.value = moveIndex(positions.value, current, target);
        })
        .onEnd(() => {
          activeId.value = null;
          runOnJS(onCommit)();
        })
        .onFinalize(() => {
          if (activeId.value === id) activeId.value = null;
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, ids, enabled, estimate, onCommit],
  );

  const rowStyle = useAnimatedStyle(() => {
    const isActive = activeId.value === id;
    return {
      position: "absolute",
      left: 0,
      right: 0,
      top: isActive ? activeTop.value : withSpring(topOf(id), SPRING),
      zIndex: isActive ? 20 : 0,
      transform: [{ scale: withSpring(isActive ? 1.02 : 1, SPRING) }],
    };
  });

  function handleLayout(event: LayoutChangeEvent) {
    onMeasure(id, event.nativeEvent.layout.height);
  }

  return (
    <Animated.View style={rowStyle} onLayout={handleLayout}>
      <View style={styles.inner}>
        {enabled ? (
          <GestureDetector gesture={gesture}>
            <View
              style={styles.handle}
              accessibilityLabel="Drag to reorder"
              accessibilityRole="adjustable"
            >
              <PlatformIcon
                sf="line.3.horizontal"
                ion="reorder-three-outline"
                size={22}
                color={colors.textSecondary}
              />
            </View>
          </GestureDetector>
        ) : null}
        <View style={styles.content}>{children}</View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  inner: {
    flexDirection: "row",
    alignItems: "center",
  },
  handle: {
    width: HANDLE_WIDTH,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    paddingRight: spacing.xxs,
  },
  content: {
    flex: 1,
  },
});
