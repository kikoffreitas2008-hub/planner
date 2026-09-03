import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius } from "@/theme/tokens";
import { PlatformIcon, type PlatformIconProps } from "@/components/ui/PlatformIcon";

export type RoundIconButtonProps = {
  sf: PlatformIconProps["sf"];
  ion: PlatformIconProps["ion"];
  accessibilityLabel: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** The circular header controls (`+` and profile). 44pt touch target. */
export function RoundIconButton({
  sf,
  ion,
  accessibilityLabel,
  onPress,
  style,
}: RoundIconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      <PlatformIcon sf={sf} ion={ion} size={22} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.mutedSurface,
  },
  pressed: {
    opacity: 0.6,
  },
});
