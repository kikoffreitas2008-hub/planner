import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Keyframe } from "react-native-reanimated";

import { useUserSettings } from "@/data/store";

// A small scale + fade for menus, dropdowns and popover-style dialogs, so they
// grow into place instead of blinking on. Exit is shorter than the entrance.
const pop = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.92 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] },
}).duration(150);

const unpop = new Keyframe({
  0: { opacity: 1, transform: [{ scale: 1 }] },
  100: { opacity: 0, transform: [{ scale: 0.96 }] },
}).duration(110);

export type PopInProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Wrap a menu / dialog card. Honors Reduce Motion (renders a plain View). */
export function PopIn({ children, style }: PopInProps) {
  const reduceMotion = useUserSettings()?.reduce_motion ?? false;
  if (reduceMotion) return <View style={style}>{children}</View>;
  return (
    <Animated.View entering={pop} exiting={unpop} style={style}>
      {children}
    </Animated.View>
  );
}
