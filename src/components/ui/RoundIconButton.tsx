import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius } from "@/theme/tokens";
import { PlatformIcon, type PlatformIconProps } from "@/components/ui/PlatformIcon";
import { Touchable } from "@/components/ui/Touchable";

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
    <Touchable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.button, style]}
    >
      <PlatformIcon sf={sf} ion={ion} size={22} color={colors.text} />
    </Touchable>
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
});
