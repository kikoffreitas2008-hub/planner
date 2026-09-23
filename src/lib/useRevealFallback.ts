import { useEffect, useRef } from "react";
import { Platform, type View } from "react-native";

const VISIBILITY_FALLBACK_MS = 400;

/**
 * Web only: Reanimated's `entering` animation starts an element hidden
 * (`visibility: hidden`) and only reveals it once the browser fires the CSS
 * `animationstart` event for it. That event can silently fail to fire —
 * seen both for content mounted inside a React Native `Modal`'s portal and
 * for a screen navigated to while another screen's exit animation is still
 * running — leaving the element permanently invisible with no error. From
 * the outside this looks like the button that opens it stopped responding,
 * or like the screen it navigates to is blank.
 *
 * Attach the returned ref to the `Animated.View` carrying `entering`. If
 * the animation hasn't revealed it well past its own duration, this forces
 * it visible. `resetKey` should change whenever the same call site mounts
 * a fresh animated instance without this hook's own effect re-running on
 * its own (e.g. a `key`-remounted child) — see ZoomIn / PopIn for the
 * common case where the hook's own component remounts and no extra key is
 * needed, versus calendar.tsx's re-keyed child.
 */
export function useRevealFallback<T extends View>(
  enabled: boolean,
  resetKey?: unknown,
  delayMs = VISIBILITY_FALLBACK_MS,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled || Platform.OS !== "web") return;
    const timer = setTimeout(() => {
      const node = ref.current as unknown as HTMLElement | null;
      if (node && getComputedStyle(node).visibility === "hidden") {
        node.style.visibility = "visible";
      }
    }, delayMs);
    return () => clearTimeout(timer);
  }, [enabled, resetKey, delayMs]);

  return ref;
}
