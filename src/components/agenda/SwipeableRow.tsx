import { useRef, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import ReanimatedSwipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";

import { markSwipe } from "@/components/agenda/swipeGuard";
import { colors, radius, spacing, typography } from "@/theme/tokens";

export type SwipeableRowProps = {
  children: ReactNode;
  /** Swipe the row to the right. Spec: complete / re-open — applied at once. */
  onSwipeRight: () => void;
  /** Swipe the row to the left. Spec: delete immediately, no dialog. */
  onSwipeLeft: () => void;
  rightLabel?: string;
  leftLabel?: string;
  enabled?: boolean;
};

const PANEL_WIDTH = 96;

/**
 * One agenda row with the two spec gestures. A swipe past a short distance
 * applies the action straight away — no editor, no confirm, no save. Swiping
 * the content rightward runs the complete action; leftward runs delete. Every
 * gesture also has a long-press menu on the card (blueprint/01 section 3.3).
 */
export function SwipeableRow({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightLabel = "Complete",
  leftLabel = "Delete",
  enabled = true,
}: SwipeableRowProps) {
  const ref = useRef<SwipeableMethods>(null);
  const acted = useRef(false);

  return (
    <ReanimatedSwipeable
      ref={ref}
      enabled={enabled}
      friction={1}
      leftThreshold={36}
      rightThreshold={36}
      dragOffsetFromLeftEdge={14}
      dragOffsetFromRightEdge={14}
      overshootLeft={false}
      overshootRight={false}
      onSwipeableOpenStartDrag={markSwipe}
      onSwipeableCloseStartDrag={markSwipe}
      renderLeftActions={() => (
        <View style={[styles.action, styles.complete]}>
          <Text style={styles.actionText}>{rightLabel}</Text>
        </View>
      )}
      renderRightActions={() => (
        <View style={[styles.action, styles.delete]}>
          <Text style={styles.actionText}>{leftLabel}</Text>
        </View>
      )}
      onSwipeableWillOpen={(direction) => {
        if (acted.current) return;
        acted.current = true;
        markSwipe();
        ref.current?.close();
        if (direction === SwipeDirection.RIGHT) onSwipeRight();
        else onSwipeLeft();
      }}
      onSwipeableClose={() => {
        acted.current = false;
      }}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    width: PANEL_WIDTH,
    marginVertical: spacing.xs,
    borderRadius: radius.large,
    justifyContent: "center",
    alignItems: "center",
  },
  complete: {
    backgroundColor: "rgba(23, 71, 42, 0.16)",
  },
  delete: {
    backgroundColor: "rgba(102, 44, 44, 0.18)",
  },
  actionText: {
    ...typography.button,
    color: colors.text,
  },
});
