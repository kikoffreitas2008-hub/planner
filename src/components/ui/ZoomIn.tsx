import { useEffect, type ReactNode } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { motion } from "@/theme/tokens";

/**
 * A short zoom-in on mount, for opening a project (blueprint/01 §4.1).
 * `disabled` (Reduce Motion) renders the child with no animation.
 */
export function ZoomIn({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  const progress = useSharedValue(disabled ? 1 : 0);

  useEffect(() => {
    if (!disabled) progress.value = withTiming(1, { duration: motion.standard });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: 0.4 + progress.value * 0.6,
    transform: [{ scale: 0.96 + progress.value * 0.04 }],
  }));

  if (disabled) return <>{children}</>;
  return <Animated.View style={style}>{children}</Animated.View>;
}
