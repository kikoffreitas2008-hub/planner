import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSyncStatus } from "@/sync/engine";
import { colors, layoutTokens, radius, spacing, typography } from "@/theme/tokens";

const TAB_BAR_HEIGHT = 68;

/** One discreet line while offline — no permanent sync indicator (blueprint/01 §8). */
export function OfflineBar() {
  const status = useSyncStatus();
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === "web" ? 0 : insets.bottom;

  if (!status.enabled || status.online) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { bottom: TAB_BAR_HEIGHT + bottomInset + spacing.xs }]}
    >
      <View style={styles.bar}>
        <Text style={styles.text}>Offline — changes saved on this device</Text>
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
    maxWidth: layoutTokens.contentMaxWidth,
    backgroundColor: colors.mutedSurface,
    borderRadius: radius.pill,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.md,
  },
  text: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
