import { useRef, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import ReanimatedSwipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";

import { colors, radius, spacing, typography } from "@/theme/tokens";

export type SwipeableRowProps = {
  children: ReactNode;
  /** Swipe the row to the right. Spec: complete / re-open. */
  onSwipeRight: () => void;
  /** Swipe the row to the left. Spec: delete immediately, no dialog. */
  onSwipeLeft: () => void;
  rightLabel?: string;
  leftLabel?: string;
  enabled?: boolean;
};

/**
 * One agenda row with the two spec gestures. Swiping the content rightward
 * reveals the left panel (complete); leftward reveals the right panel
 * (delete). Every gesture has an accessible menu equivalent on the card
 * itself, per blueprint/01 section 3.3.
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

  return (
    <ReanimatedSwipeable
      ref={ref}
      enabled={enabled}
      friction={1.6}
      leftThreshold={64}
      rightThreshold={64}
      overshootLeft={false}
      overshootRight={false}
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
      onSwipeableOpen={(direction) => {
        ref.current?.close();
        if (direction === SwipeDirection.RIGHT) onSwipeRight();
        else onSwipeLeft();
      }}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    flex: 1,
    marginVertical: spacing.xs,
    borderRadius: radius.large,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  complete: {
    alignItems: "flex-start",
    backgroundColor: "rgba(23, 71, 42, 0.14)",
  },
  delete: {
    alignItems: "flex-end",
    backgroundColor: "rgba(102, 44, 44, 0.16)",
  },
  actionText: {
    ...typography.button,
    color: colors.text,
  },
});
