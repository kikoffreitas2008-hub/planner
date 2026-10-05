import { StyleSheet, View } from "react-native";

import { ColorDot } from "@/components/ui/ColorDot";
import { Touchable } from "@/components/ui/Touchable";
import { colors, palette, radius, spacing, type PaletteKey } from "@/theme/tokens";

const PALETTE_KEYS = Object.keys(palette) as PaletteKey[];

export type ColorSwatchesProps = {
  value: PaletteKey;
  onChange: (color: PaletteKey) => void;
};

/** The closed palette as a row of tappable dots, the current one ringed. */
export function ColorSwatches({ value, onChange }: ColorSwatchesProps) {
  return (
    <View style={styles.swatches}>
      {PALETTE_KEYS.map((key) => (
        <Touchable
          key={key}
          haptic="selection"
          onPress={() => onChange(key)}
          accessibilityLabel={key}
          accessibilityState={{ selected: value === key }}
          style={[styles.swatch, value === key && styles.swatchActive]}
        >
          <ColorDot color={key} size={24} />
        </Touchable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  swatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  swatch: {
    padding: 3,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchActive: {
    borderColor: colors.text,
  },
});
