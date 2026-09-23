import { useEffect, useRef, type ReactNode } from "react";
import { Platform, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Keyframe } from "react-native-reanimated";

import { useUserSettings } from "@/data/store";

// A small scale + fade for menus, dropdowns and popover-style dialogs, so they
// grow into place instead of blinking on. The exit is left to the host Modal's
// `animationType="fade"`: running a reanimated exit on top of it made the menu
// flash back to full opacity for a frame after the Modal had already faded it
// out, then vanish.
const pop = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.92 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] },
}).duration(150);

// Web only: Reanimated's `entering` animation starts hidden (`visibility:
// hidden`) and only reveals the element once the browser fires the CSS
// `animationstart` event for it. That event can silently never fire — seen
// happening for content mounted inside a React Native `Modal`'s portal —
// which leaves the element permanently invisible with no error, looking like
// the button that opens it stopped responding. If the animation hasn't
// revealed the element well past its own duration, force it visible.
const VISIBILITY_FALLBACK_MS = 400;

export type PopInProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Wrap a menu / dialog card. Honors Reduce Motion (renders a plain View). */
export function PopIn({ children, style }: PopInProps) {
  const reduceMotion = useUserSettings()?.reduce_motion ?? false;
  const ref = useRef<View>(null);

  useEffect(() => {
    if (reduceMotion || Platform.OS !== "web") return;
    const timer = setTimeout(() => {
      const node = ref.current as unknown as HTMLElement | null;
      if (node && getComputedStyle(node).visibility === "hidden") {
        node.style.visibility = "visible";
      }
    }, VISIBILITY_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [reduceMotion]);

  if (reduceMotion) return <View style={style}>{children}</View>;
  return (
    <Animated.View ref={ref} entering={pop} style={style}>
      {children}
    </Animated.View>
  );
}
