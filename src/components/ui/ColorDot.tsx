import { StyleSheet, View } from "react-native";

import { Touchable } from "@/components/ui/Touchable";
import { palette, radius, type PaletteKey } from "@/theme/tokens";

export type ColorDotProps = {
  color: PaletteKey;
  size?: number;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** The small colour circle shown beside an item's time. Tapping opens the palette. */
export function ColorDot({ color, size = 16, onPress, accessibilityLabel }: ColorDotProps) {
  const dot = (
    <View
      style={[
        styles.dot,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: palette[color].start },
      ]}
    />
  );

  if (!onPress) return dot;

  return (
    <Touchable
      hitSlop={14}
      haptic="selection"
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? `Colour: ${color}`}
      style={styles.pressable}
    >
      {dot}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.12)",
    borderRadius: radius.pill,
  },
});
