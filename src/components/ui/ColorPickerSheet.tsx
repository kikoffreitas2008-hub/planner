import { useEffect, useRef } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { ColorDot } from "@/components/ui/ColorDot";
import { colors, palette, radius, shadow, spacing, typography, type PaletteKey } from "@/theme/tokens";

const PALETTE_KEYS = Object.keys(palette) as PaletteKey[];

export type ColorPickerSheetProps = {
  visible: boolean;
  value: PaletteKey;
  /** Applied immediately as the user taps, so the change previews live. */
  onPick: (color: PaletteKey) => void;
  onClose: () => void;
};

/**
 * The closed pastel palette — no free colour picking (blueprint/01 section 10).
 * Tapping a swatch applies at once; the close cross reverts to the colour the
 * sheet opened with.
 */
export function ColorPickerSheet({ visible, value, onPick, onClose }: ColorPickerSheetProps) {
  const openedWith = useRef(value);
  useEffect(() => {
    if (visible) openedWith.current = value;
    // Only capture when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.backdrop}
        onPress={() => {
          onPick(openedWith.current);
          onClose();
        }}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Colour</Text>
            <Pressable
              onPress={() => {
                onPick(openedWith.current);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityLabel="Close without keeping the change"
              hitSlop={8}
            >
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.grid}>
            {PALETTE_KEYS.map((key) => (
              <Pressable
                key={key}
                onPress={() => onPick(key)}
                accessibilityRole="button"
                accessibilityLabel={key}
                accessibilityState={{ selected: value === key }}
                style={[styles.swatch, value === key && styles.swatchActive]}
              >
                <ColorDot color={key} size={30} />
              </Pressable>
            ))}
          </View>

          <Pressable onPress={onClose} accessibilityRole="button" style={styles.done}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.32)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.large,
    padding: spacing.lg,
    gap: spacing.md,
    ...(Platform.OS === "web" ? { boxShadow: "0 12px 26px rgba(0,0,0,0.18)" } : shadow.floating),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  close: {
    ...typography.heading,
    color: colors.textSecondary,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
  },
  swatch: {
    padding: 4,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchActive: {
    borderColor: colors.text,
  },
  done: {
    backgroundColor: colors.text,
    borderRadius: radius.medium,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  doneText: {
    ...typography.button,
    color: colors.surface,
  },
});
