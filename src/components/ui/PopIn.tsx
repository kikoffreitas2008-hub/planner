import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Keyframe } from "react-native-reanimated";

import { useUserSettings } from "@/data/store";
import { useRevealFallback } from "@/lib/useRevealFallback";

// A small scale + fade for menus, dropdowns and popover-style dialogs, so they
// grow into place instead of blinking on. The exit is left to the host Modal's
// `animationType="fade"`: running a reanimated exit on top of it made the menu
// flash back to full opacity for a frame after the Modal had already faded it
// out, then vanish.
const pop = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.92 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] },
}).duration(150);

export type PopInProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Wrap a menu / dialog card. Honors Reduce Motion (renders a plain View). */
export function PopIn({ children, style }: PopInProps) {
  const reduceMotion = useUserSettings()?.reduce_motion ?? false;
  const ref = useRevealFallback<View>(!reduceMotion);

  if (reduceMotion) return <View style={style}>{children}</View>;
  return (
    <Animated.View ref={ref} entering={pop} style={style}>
      {children}
    </Animated.View>
  );
}
