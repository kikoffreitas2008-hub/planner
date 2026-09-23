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
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { PlatformIcon } from "@/components/ui/PlatformIcon";
import { useUserSettings } from "@/data/store";
import { colors, spacing } from "@/theme/tokens";

const SPRING = { damping: 22, stiffness: 200 } as const;
const HANDLE_WIDTH = 40;
const LONG_PRESS_MS = 250;
/** Movement past this many px before the long-press completes counts as a
 * drag attempt rather than a tap, even though the pan itself fails. */
const DRAG_ATTEMPT_PX = 6;

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
  /**
   * `handle` (default): a grip on the left, press and drag it.
   * `longPress`: no grip — hold anywhere on the row, then drag it up or down.
   */
  dragMode?: "handle" | "longPress";
  /** Used for layout before rows have measured themselves. */
  estimatedRowHeight?: number;
  /**
   * `longPress` mode only: called when a touch moves more than a few px
   * before the long-press hold completes, i.e. a drag was attempted but
   * didn't activate. Consumers use this to suppress the tap-to-open handler
   * they layer over the row, so a failed drag does nothing instead of
   * falling through to a tap.
   */
  onDragAttempt?: (id: string) => void;
};

/**
 * A vertical drag-to-reorder list that measures its own rows, so it works with
 * fixed and variable heights alike. By default each row carries a grip handle
 * (three lines) on the left; press and drag it — no long-press. With
 * `dragMode="longPress"` the whole row is the handle instead. On drop it calls
 * `onReorder` with the new id order (blueprint/01 §4.4).
 */
export function DraggableColumn<T extends { id: string }>({
  data,
  renderItem,
  onReorder,
  enabled = true,
  dragMode = "handle",
  estimatedRowHeight = 64,
  onDragAttempt,
}: DraggableColumnProps<T>) {
  const idsKey = data.map((item) => item.id).join("|");
  const ids = useMemo(() => (idsKey ? idsKey.split("|") : []), [idsKey]);
  const reduceMotion = useUserSettings()?.reduce_motion ?? false;

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
          dragMode={dragMode}
          estimate={estimatedRowHeight}
          reduceMotion={reduceMotion}
          positions={positions}
          heights={heights}
          activeId={activeId}
          activeTop={activeTop}
          startTop={startTop}
          onMeasure={measure}
          onCommit={commit}
          onDragAttempt={onDragAttempt}
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
  dragMode: "handle" | "longPress";
  estimate: number;
  reduceMotion: boolean;
  positions: SharedValue<Indexed>;
  heights: SharedValue<Heights>;
  activeId: SharedValue<string | null>;
  activeTop: SharedValue<number>;
  startTop: SharedValue<number>;
  onMeasure: (id: string, height: number) => void;
  onCommit: () => void;
  onDragAttempt?: (id: string) => void;
  children: ReactNode;
};

function Row({
  id,
  ids,
  enabled,
  dragMode,
  estimate,
  reduceMotion,
  positions,
  heights,
  activeId,
  activeTop,
  startTop,
  onMeasure,
  onCommit,
  onDragAttempt,
  children,
}: RowProps) {
  const wholeRow = dragMode === "longPress";
  const touchOrigin = useSharedValue({ x: 0, y: 0 });

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
    () => {
      const pan = Gesture.Pan().enabled(enabled);
      // Moving before the hold completes fails the pan, so a plain swipe or
      // scroll never turns into a drag.
      if (wholeRow) pan.activateAfterLongPress(LONG_PRESS_MS);
      return pan
        .activeOffsetY([-4, 4])
        .failOffsetX([-16, 16])
        .onTouchesDown((event) => {
          const touch = event.allTouches[0];
          if (touch) touchOrigin.value = { x: touch.x, y: touch.y };
        })
        .onTouchesMove((event) => {
          // Fires for every touch move regardless of activation state, so it
          // also catches the case the pan itself fails on: a drag started
          // before the long-press hold completed. Tell the consumer so it
          // can keep this from also being read as a tap.
          if (!wholeRow || !onDragAttempt) return;
          const touch = event.allTouches[0];
          if (!touch) return;
          const dx = touch.x - touchOrigin.value.x;
          const dy = touch.y - touchOrigin.value.y;
          if (Math.hypot(dx, dy) > DRAG_ATTEMPT_PX) {
            runOnJS(onDragAttempt)(id);
          }
        })
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
        });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, ids, enabled, wholeRow, estimate, onCommit, onDragAttempt, touchOrigin],
  );

  const rowStyle = useAnimatedStyle(() => {
    const isActive = activeId.value === id;
    const restTop = topOf(id);
    const restScale = isActive ? 1.02 : 1;
    return {
      position: "absolute",
      left: 0,
      right: 0,
      top: isActive ? activeTop.value : reduceMotion ? withTiming(restTop, { duration: 0 }) : withSpring(restTop, SPRING),
      zIndex: isActive ? 20 : 0,
      transform: [
        { scale: reduceMotion ? restScale : withSpring(restScale, SPRING) },
      ],
    };
  });

  function handleLayout(event: LayoutChangeEvent) {
    onMeasure(id, event.nativeEvent.layout.height);
  }

  function moveByAccessibility(direction: 1 | -1) {
    const current = positions.value[id];
    const target = current + direction;
    if (target < 0 || target >= ids.length) return;
    positions.value = moveIndex(positions.value, current, target);
    onCommit();
  }

  return (
    <Animated.View style={rowStyle} onLayout={handleLayout}>
      <View style={styles.inner}>
        {enabled && !wholeRow ? (
          <GestureDetector gesture={gesture}>
            <View
              style={styles.handle}
              accessibilityLabel="Drag to reorder"
              accessibilityRole="adjustable"
              accessibilityActions={[
                { name: "increment", label: "Move down" },
                { name: "decrement", label: "Move up" },
              ]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === "increment") moveByAccessibility(1);
                else if (event.nativeEvent.actionName === "decrement") moveByAccessibility(-1);
              }}
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
        {wholeRow ? (
          <GestureDetector gesture={gesture}>
            <View style={styles.content}>{children}</View>
          </GestureDetector>
        ) : (
          <View style={styles.content}>{children}</View>
        )}
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
