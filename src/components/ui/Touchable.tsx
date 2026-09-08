import { forwardRef } from "react";
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useUserSettings } from "@/data/store";
import { haptic, type HapticKind } from "@/lib/haptics";
import { motion, type PressVariant } from "@/theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type TouchableProps = Omit<PressableProps, "style"> & {
  /**
   * How much the control reacts to a press:
   * - `control` (default): chips, icon buttons, menu triggers — firm sink.
   * - `row`: full-width list rows — mostly an opacity dip, minimal scale.
   * - `card`: elevated cards — a whisper of scale so the shadow stays put.
   */
  variant?: PressVariant;
  /** Taptic feedback on press-in. `false` to silence. Native only (see haptics). */
  haptic?: HapticKind | false;
  /**
   * Static style for the pressable. Touchable owns the pressed state, so the
   * `({ pressed }) => …` callback form `Pressable` allows is intentionally
   * not accepted — the spring below replaces it.
   */
  style?: StyleProp<ViewStyle>;
};

/**
 * The app's standard tappable. Wraps `Pressable` with a spring-driven
 * press-in (scale + opacity) so every button, chip, row and card has the
 * same iOS-like "give" instead of an abrupt opacity flip. Honors Reduce
 * Motion (opacity only, no scale, no spring) and `disabled` (dimmed, inert).
 *
 * Drop-in for `Pressable`: same props, plus `variant` and `haptic`.
 */
export const Touchable = forwardRef<View, TouchableProps>(function Touchable(
  {
    variant = "control",
    haptic: hapticKind = variant === "card" ? false : "light",
    style,
    disabled,
    onPressIn,
    onPressOut,
    accessibilityRole = "button",
    children,
    ...rest
  },
  ref,
) {
  const reduceMotion = useUserSettings()?.reduce_motion ?? false;
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = 1 - pressed.value * (1 - motion.pressOpacity[variant]);
    if (reduceMotion) return { opacity };
    const scale = 1 - pressed.value * (1 - motion.pressScale[variant]);
    return { opacity, transform: [{ scale }] };
  });

  return (
    <AnimatedPressable
      ref={ref}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      onPressIn={(event) => {
        pressed.value = reduceMotion
          ? withTiming(1, { duration: 0 })
          : withSpring(1, motion.pressSpring);
        if (hapticKind) haptic(hapticKind);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.value = reduceMotion
          ? withTiming(0, { duration: motion.quick })
          : withSpring(0, motion.pressSpring);
        onPressOut?.(event);
      }}
      style={[style, styles.cursor, disabled ? styles.disabled : null, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  // Web only: a pointer cursor over every tappable. Inert on native.
  cursor: { cursor: "pointer" },
  disabled: { opacity: 0.4 },
});
