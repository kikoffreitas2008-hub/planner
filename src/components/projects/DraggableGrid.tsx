/* eslint-disable react-hooks/immutability */
// Reanimated's model is to pass SharedValues down and assign `.value` inside
// worklets; this file follows that pattern deliberately (see DraggableColumn).
import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { useUserSettings } from "@/data/store";

const SPRING = { damping: 22, stiffness: 200 } as const;
const LONG_PRESS_MS = 250;
/** Movement past this many px before the long-press completes counts as a
 * drag attempt rather than a tap, even though the pan itself fails. */
const DRAG_ATTEMPT_PX = 6;

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

export type DraggableGridProps<T extends { id: string }> = {
  data: readonly T[];
  renderItem: (item: T) => ReactNode;
  onReorder: (orderedIds: string[]) => void;
  /** Every cell is a `cellSize` square. */
  cellSize: number;
  columns: number;
  gap: number;
  enabled?: boolean;
  /**
   * Called when a touch moves more than a few px before the long-press hold
   * completes — a drag was attempted but didn't activate — so the consumer
   * can keep that release from also opening the card.
   */
  onDragAttempt?: (id: string) => void;
};

/**
 * The grid counterpart of `DraggableColumn` in `longPress` mode: hold a card,
 * then drag it anywhere in the grid; the others slide out of the way and the
 * new order is reported on drop.
 */
export function DraggableGrid<T extends { id: string }>({
  data,
  renderItem,
  onReorder,
  cellSize,
  columns,
  gap,
  enabled = true,
  onDragAttempt,
}: DraggableGridProps<T>) {
  const idsKey = data.map((item) => item.id).join("|");
  const ids = useMemo(() => (idsKey ? idsKey.split("|") : []), [idsKey]);
  const reduceMotion = useUserSettings()?.reduce_motion ?? false;

  const positions = useSharedValue<Indexed>(indexMap(ids));
  const activeId = useSharedValue<string | null>(null);
  const activeX = useSharedValue(0);
  const activeY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  useEffect(() => {
    positions.value = indexMap(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const commit = useCallback(() => {
    const order = [...ids].sort((a, b) => positions.value[a] - positions.value[b]);
    onReorder(order);
  }, [ids, onReorder, positions]);

  const rows = Math.ceil(ids.length / columns);
  const height = rows > 0 ? rows * cellSize + (rows - 1) * gap : 0;

  return (
    <View style={{ height }}>
      {data.map((item) => (
        <Cell
          key={item.id}
          id={item.id}
          count={ids.length}
          enabled={enabled}
          cellSize={cellSize}
          columns={columns}
          gap={gap}
          reduceMotion={reduceMotion}
          positions={positions}
          activeId={activeId}
          activeX={activeX}
          activeY={activeY}
          startX={startX}
          startY={startY}
          onCommit={commit}
          onDragAttempt={onDragAttempt}
        >
          {renderItem(item)}
        </Cell>
      ))}
    </View>
  );
}

type CellProps = {
  id: string;
  count: number;
  enabled: boolean;
  cellSize: number;
  columns: number;
  gap: number;
  reduceMotion: boolean;
  positions: SharedValue<Indexed>;
  activeId: SharedValue<string | null>;
  activeX: SharedValue<number>;
  activeY: SharedValue<number>;
  startX: SharedValue<number>;
  startY: SharedValue<number>;
  onCommit: () => void;
  onDragAttempt?: (id: string) => void;
  children: ReactNode;
};

function Cell({
  id,
  count,
  enabled,
  cellSize,
  columns,
  gap,
  reduceMotion,
  positions,
  activeId,
  activeX,
  activeY,
  startX,
  startY,
  onCommit,
  onDragAttempt,
  children,
}: CellProps) {
  const touchOrigin = useSharedValue({ x: 0, y: 0 });
  const pitch = cellSize + gap;

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        // Moving before the hold completes fails the pan, so a plain scroll
        // never turns into a drag.
        .activateAfterLongPress(LONG_PRESS_MS)
        .onTouchesDown((event) => {
          const touch = event.allTouches[0];
          if (touch) touchOrigin.value = { x: touch.x, y: touch.y };
        })
        .onTouchesMove((event) => {
          if (!onDragAttempt) return;
          const touch = event.allTouches[0];
          if (!touch) return;
          const dx = touch.x - touchOrigin.value.x;
          const dy = touch.y - touchOrigin.value.y;
          if (Math.hypot(dx, dy) > DRAG_ATTEMPT_PX) runOnJS(onDragAttempt)(id);
        })
        .onStart(() => {
          const index = positions.value[id];
          startX.value = (index % columns) * pitch;
          startY.value = Math.floor(index / columns) * pitch;
          activeX.value = startX.value;
          activeY.value = startY.value;
          activeId.value = id;
        })
        .onUpdate((event) => {
          activeX.value = startX.value + event.translationX;
          activeY.value = startY.value + event.translationY;
          // The slot under the card's centre is where it would land.
          const col = Math.min(
            columns - 1,
            Math.max(0, Math.floor((activeX.value + cellSize / 2 + gap / 2) / pitch)),
          );
          const row = Math.max(0, Math.floor((activeY.value + cellSize / 2 + gap / 2) / pitch));
          const target = Math.min(count - 1, row * columns + col);
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
    [id, count, enabled, cellSize, columns, gap, pitch, onCommit, onDragAttempt, touchOrigin],
  );

  const style = useAnimatedStyle(() => {
    const isActive = activeId.value === id;
    const index = positions.value[id] ?? 0;
    const restX = (index % columns) * pitch;
    const restY = Math.floor(index / columns) * pitch;
    const settle = (to: number) =>
      reduceMotion ? withTiming(to, { duration: 0 }) : withSpring(to, SPRING);
    const scale = isActive ? 1.04 : 1;
    return {
      position: "absolute",
      top: 0,
      left: 0,
      width: cellSize,
      height: cellSize,
      zIndex: isActive ? 20 : 0,
      transform: [
        { translateX: isActive ? activeX.value : settle(restX) },
        { translateY: isActive ? activeY.value : settle(restY) },
        { scale: reduceMotion ? scale : withSpring(scale, SPRING) },
      ],
    };
  });

  function moveByAccessibility(direction: 1 | -1) {
    const current = positions.value[id];
    const target = current + direction;
    if (target < 0 || target >= count) return;
    positions.value = moveIndex(positions.value, current, target);
    onCommit();
  }

  return (
    <Animated.View
      style={style}
      accessibilityActions={[
        { name: "increment", label: "Move later" },
        { name: "decrement", label: "Move earlier" },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "increment") moveByAccessibility(1);
        else if (event.nativeEvent.actionName === "decrement") moveByAccessibility(-1);
      }}
    >
      <GestureDetector gesture={gesture}>
        <View style={{ flex: 1 }}>{children}</View>
      </GestureDetector>
    </Animated.View>
  );
}
