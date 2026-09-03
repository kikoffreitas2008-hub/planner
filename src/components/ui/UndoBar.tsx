import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { undoLast, useUndoBar } from "@/data/undoBar";
import { colors, layoutTokens, radius, shadow, spacing, typography } from "@/theme/tokens";

const TAB_BAR_HEIGHT = 68;

/** The discreet "… — Undo" bar. Mounted once, near the bottom of every tab. */
export function UndoBar() {
  const { visible, message } = useUndoBar();
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === "web" ? 0 : insets.bottom;

  if (!visible) return null;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: TAB_BAR_HEIGHT + bottomInset + spacing.sm }]}>
      <View style={styles.bar}>
        <Text style={styles.message}>{message}</Text>
        <Pressable onPress={undoLast} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.undo}>Undo</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: layoutTokens.horizontalPadding,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    width: "100%",
    maxWidth: layoutTokens.contentMaxWidth,
    backgroundColor: colors.text,
    borderRadius: radius.medium,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...(Platform.OS === "web"
      ? { boxShadow: "0 12px 26px rgba(0, 0, 0, 0.18)" }
      : shadow.floating),
  },
  message: {
    ...typography.body,
    color: colors.surface,
    flexShrink: 1,
  },
  undo: {
    ...typography.button,
    color: colors.surface,
    textDecorationLine: "underline",
  },
});
