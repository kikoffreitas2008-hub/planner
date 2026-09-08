import type { ReactNode } from "react";
import { View } from "react-native";
import Animated, { Keyframe } from "react-native-reanimated";

import { motion } from "@/theme/tokens";

// A short zoom-in on mount and a quicker zoom-out on unmount, for opening and
// leaving a project or one of its tasks (blueprint/01 §4.1). The exit is
// deliberately faster than the enter so back navigation still feels snappy.
const enter = new Keyframe({
  0: { opacity: 0.35, transform: [{ scale: 0.95 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] },
}).duration(motion.standard);

const leave = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }] },
  100: { opacity: 0, transform: [{ scale: 0.97 }] },
}).duration(Math.round(motion.standard * 0.6));

/** `disabled` (Reduce Motion) renders the child with no animation. */
export function ZoomIn({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
  if (disabled) return <View>{children}</View>;
  return (
    <Animated.View entering={enter} exiting={leave}>
      {children}
    </Animated.View>
  );
}
