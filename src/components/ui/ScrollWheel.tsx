/* eslint-disable react-hooks/immutability */
// Reanimated SharedValues are assigned through `.value`, from worklets and
// from the web-only wheel/key handlers alike; the rule cannot tell them apart
// from plain mutable props.
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { haptic } from "@/lib/haptics";
import { colors, radius } from "@/theme/tokens";

/** Height of one row, measured along the wheel's surface. */
export const WHEEL_ROW_HEIGHT = 34;
/** Radius of the drum the rows are drawn on: ~22° per row, about three rows each side. */
const RADIUS = 88;
/** The visible height: the drum seen from the front. */
export const WHEEL_HEIGHT = RADIUS * 2;
/** Top of the centre row (and of the selection band) inside the wheel. */
export const WHEEL_BAND_TOP = RADIUS - WHEEL_ROW_HEIGHT / 2;

const ROW = WHEEL_ROW_HEIGHT;
const HALF_PI = Math.PI / 2;
/** UIScrollView's normal deceleration, per millisecond — sets how far a flick carries. */
const DECELERATION = 0.998;
/** A wheel event at least this big is one notch of a mouse wheel: exactly one row. */
const NOTCH_PX = 40;
/** Trackpad scrolling snaps to the nearest row after this long without input. */
const TRACKPAD_SETTLE_MS = 120;

const settleEasing = Easing.out(Easing.cubic);

export type ScrollWheelProps = {
  values: readonly string[];
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel?: string;
  /** Wrap around the ends, like the iOS time picker (59 → 00). */
  loop?: boolean;
  /** Draw this wheel's own selection band. Off when the parent draws one band across several wheels. */
  band?: boolean;
};

/**
 * An iOS-style picker wheel: rows drawn on a 3D drum, a grey selection band
 * with the selected row in full colour, momentum that always comes to rest on
 * a row, tap-a-row to select it, and optional wrap-around. Built on the
 * gesture handler and Reanimated, so it behaves the same on web and iPhone.
 *
 * On the desktop every mouse-wheel notch and arrow key moves exactly one row,
 * counted from where the wheel is heading rather than where it happens to be
 * mid-animation — so quick clicks never skip a value.
 */
export function ScrollWheel({
  values,
  value,
  onChange,
  accessibilityLabel,
  loop = false,
  band = true,
}: ScrollWheelProps) {
  const count = values.length;
  const startIndex = Math.max(0, values.indexOf(value));

  /** Scroll position in px along the drum; row i sits at i * ROW. Unbounded when looping. */
  const offset = useSharedValue(startIndex * ROW);
  /** The row the wheel is at or heading to, in the same unbounded units. */
  const target = useSharedValue(startIndex);
  const dragStart = useSharedValue(0);

  const frameRef = useRef<View>(null);

  // Latest props for the handlers below. The gestures are built once and the
  // web listeners are bound once, so they read these instead of closures.
  const latest = useRef({ values, onChange, reported: value });
  useEffect(() => {
    latest.current.values = values;
    latest.current.onChange = onChange;
  });
  useEffect(() => {
    latest.current.reported = value;
  }, [value]);

  /**
   * Report the row the wheel is heading to, the moment it is chosen — before
   * the wheel finishes turning, so "Done" mid-spin still counts. Called
   * directly by every input rather than from an animated reaction: on web a
   * reaction's first run can land seconds after the wheel opens, and a pick
   * made before then was lost.
   */
  function report(step: number) {
    const { values: rows, onChange: notify, reported } = latest.current;
    const next = rows[wrapIndex(step, rows.length)];
    if (next === undefined || next === reported) return;
    latest.current.reported = next;
    notify(next);
  }

  /** Move to an absolute (unbounded) row. Callable from JS. */
  function goTo(step: number, duration = 220) {
    const clamped = loop ? step : Math.min(count - 1, Math.max(0, step));
    target.value = clamped;
    offset.value = withTiming(clamped * ROW, { duration, easing: settleEasing });
    report(clamped);
  }

  // Follow the value when the parent changes it (e.g. a reset).
  useEffect(() => {
    const index = values.indexOf(value);
    if (index < 0 || wrapIndex(target.value, count) === index) return;
    // When looping, take the short way round.
    let step = index;
    if (loop) {
      const base = target.value - wrapIndex(target.value, count);
      step = base + index;
      if (step - target.value > count / 2) step -= count;
      else if (target.value - step > count / 2) step += count;
    }
    target.value = step;
    offset.value = withTiming(step * ROW, { duration: 220, easing: settleEasing });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // A tick for every row that passes the band (native only; a no-op on web).
  useAnimatedReaction(
    () => Math.round(offset.value / ROW),
    (row, previous) => {
      if (previous !== null && row !== previous) runOnJS(haptic)("selection");
    },
  );

  // Mouse wheel, trackpad and arrow keys (web).
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const node = frameRef.current as unknown as HTMLElement | null;
    if (!node) return;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const scale = event.deltaMode === 1 ? ROW : event.deltaMode === 2 ? WHEEL_HEIGHT : 1;
      const delta = event.deltaY * scale;
      if (delta === 0) return;
      if (Math.abs(delta) >= NOTCH_PX) {
        if (settleTimer) clearTimeout(settleTimer);
        goTo(target.value + Math.sign(delta), 160);
        return;
      }
      // Trackpad: follow the fingers, then settle on the nearest row. A new
      // gesture starts from where the wheel was heading, so a move still in
      // flight (a notch, a flick) is kept rather than cut short.
      cancelAnimation(offset);
      const from = settleTimer ? offset.value : target.value * ROW;
      offset.value = boundOffset(from + delta, count, loop);
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(() => goTo(Math.round(offset.value / ROW), 180), TRACKPAD_SETTLE_MS);
    };

    const onKey = (event: KeyboardEvent) => {
      const moves: Record<string, number> = {
        ArrowDown: 1,
        ArrowUp: -1,
        PageDown: 5,
        PageUp: -5,
      };
      if (event.key in moves) {
        event.preventDefault();
        goTo(target.value + moves[event.key], 160);
      } else if (!loop && event.key === "Home") {
        event.preventDefault();
        goTo(0);
      } else if (!loop && event.key === "End") {
        event.preventDefault();
        goTo(count - 1);
      }
    };

    node.addEventListener("wheel", onWheel, { passive: false });
    node.addEventListener("keydown", onKey);
    return () => {
      if (settleTimer) clearTimeout(settleTimer);
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("keydown", onKey);
    };
    // goTo reads the latest props through refs/shared values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, loop]);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activeOffsetY([-3, 3])
      .onBegin(() => {
        cancelAnimation(offset);
        dragStart.value = offset.value;
      })
      .onUpdate((event) => {
        offset.value = rubberBand(dragStart.value - event.translationY, count, loop);
      })
      // `report` reads refs, but only when the gesture ends — never during render.
      // eslint-disable-next-line react-hooks/refs
      .onEnd((event) => {
        // Project where a UIScrollView-style deceleration would stop, then
        // land on the nearest row so the wheel always rests on a value.
        const velocity = -event.velocityY / 1000; // px per ms
        const travel = (velocity * DECELERATION) / (1 - DECELERATION);
        let step = Math.round((offset.value + travel) / ROW);
        if (!loop) step = Math.min(count - 1, Math.max(0, step));
        const distance = Math.abs(step * ROW - offset.value);
        const speed = Math.abs(velocity);
        // Match the ease-out's starting speed to the finger's, within reason.
        const duration =
          speed > 0.05 ? Math.min(1100, Math.max(260, (3 * distance) / speed)) : 240;
        target.value = step;
        offset.value = withTiming(step * ROW, { duration, easing: settleEasing });
        runOnJS(report)(step);
      });

    // eslint-disable-next-line react-hooks/refs -- see the pan's onEnd
    const tap = Gesture.Tap().onEnd((event) => {
      // A tap above or below the band brings that row to the centre.
      const fromCentre = event.y - RADIUS;
      if (Math.abs(fromCentre) < ROW / 2) return;
      const angle = Math.asin(Math.max(-1, Math.min(1, fromCentre / RADIUS)));
      const rows = Math.round((angle * RADIUS) / ROW);
      let step = Math.round(offset.value / ROW) + rows;
      if (!loop) step = Math.min(count - 1, Math.max(0, step));
      target.value = step;
      offset.value = withTiming(step * ROW, { duration: 260, easing: settleEasing });
      runOnJS(report)(step);
    });

    return Gesture.Race(pan, tap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, loop]);

  const selected = values[wrapIndex(target.value, count)] ?? value;

  return (
    <GestureHandlerRootView style={styles.frame}>
      <View
        ref={frameRef}
        style={styles.drum}
        focusable
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: selected }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "increment") goTo(target.value + 1);
          else if (event.nativeEvent.actionName === "decrement") goTo(target.value - 1);
        }}
      >
        <GestureDetector gesture={gesture}>
          <View style={styles.fill}>
            {band ? <WheelSelectionBand /> : null}

            {/* Rows off the band: grey, turning away on the drum. */}
            {values.map((entry, index) => (
              <WheelRow key={entry} index={index} count={count} loop={loop} offset={offset}>
                <Text style={[styles.text, styles.textDim]}>{entry}</Text>
              </WheelRow>
            ))}

            {/* The same rows again, clipped to the band and in full colour. */}
            <View pointerEvents="none" style={styles.lens}>
              <View style={styles.lensInner}>
                {values.map((entry, index) => (
                  <WheelRow key={entry} index={index} count={count} loop={loop} offset={offset}>
                    <Text style={styles.text}>{entry}</Text>
                  </WheelRow>
                ))}
              </View>
            </View>
          </View>
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  );
}

/** The grey rounded band behind the selected row. Exported so a parent can draw one across several wheels. */
export function WheelSelectionBand({ style }: { style?: object }) {
  return <View pointerEvents="none" style={[styles.band, style]} />;
}

type WheelRowProps = {
  index: number;
  count: number;
  loop: boolean;
  offset: SharedValue<number>;
  children: ReactNode;
};

function WheelRow({ index, count, loop, offset, children }: WheelRowProps) {
  const style = useAnimatedStyle(() => {
    let along = index * ROW - offset.value;
    if (loop) {
      const span = count * ROW;
      along = ((((along + span / 2) % span) + span) % span) - span / 2;
    }
    const angle = along / RADIUS;
    if (Math.abs(angle) >= HALF_PI) return { opacity: 0, transform: [{ translateY: 0 }] };
    return {
      opacity: Math.cos(angle),
      transform: [
        { perspective: 600 },
        { translateY: RADIUS * Math.sin(angle) },
        { rotateX: `${-angle}rad` },
      ],
    };
  });
  return <Animated.View style={[styles.row, style]}>{children}</Animated.View>;
}

function wrapIndex(step: number, count: number): number {
  "worklet";
  return count > 0 ? ((step % count) + count) % count : 0;
}

function boundOffset(next: number, count: number, loop: boolean): number {
  "worklet";
  if (loop) return next;
  return Math.min((count - 1) * ROW, Math.max(0, next));
}

/** Past either end the wheel gives a little, then springs back on release. */
function rubberBand(next: number, count: number, loop: boolean): number {
  "worklet";
  if (loop) return next;
  const max = (count - 1) * ROW;
  if (next < 0) return next * 0.35;
  if (next > max) return max + (next - max) * 0.35;
  return next;
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    height: WHEEL_HEIGHT,
  },
  drum: {
    flex: 1,
    overflow: "hidden",
    // Web: the wheel owns vertical drags (no page scroll) and never selects text.
    ...(Platform.OS === "web"
      ? ({ touchAction: "none", userSelect: "none", outlineStyle: "none", cursor: "grab" } as object)
      : null),
  },
  fill: {
    flex: 1,
  },
  band: {
    position: "absolute",
    left: 0,
    right: 0,
    top: WHEEL_BAND_TOP,
    height: ROW,
    borderRadius: radius.small,
    backgroundColor: "rgba(118, 118, 128, 0.12)",
  },
  row: {
    position: "absolute",
    left: 0,
    right: 0,
    top: WHEEL_BAND_TOP,
    height: ROW,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
    color: colors.text,
  },
  textDim: {
    color: colors.textSecondary,
  },
  lens: {
    position: "absolute",
    left: 0,
    right: 0,
    top: WHEEL_BAND_TOP,
    height: ROW,
    overflow: "hidden",
  },
  lensInner: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -WHEEL_BAND_TOP,
    height: WHEEL_HEIGHT,
  },
});
