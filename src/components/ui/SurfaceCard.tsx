import type { ReactNode } from "react";
import { Platform, StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";

import { colors, radius, shadow, spacing } from "@/theme/tokens";

export type SurfaceCardProps = ViewProps & {
  children: ReactNode;
};

/** A plain white three-dimensional card — same depth as GlossyCard, no colour. */
export function SurfaceCard({ children, style, ...props }: SurfaceCardProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      <View
        accessibilityElementsHidden
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={styles.innerHighlight}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: radius.large,
    backgroundColor: colors.surface,
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0 9px 22px rgba(30, 30, 34, 0.14)" } as ViewStyle)
      : shadow.card),
  },
  innerHighlight: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 1,
    borderRadius: radius.large,
    borderColor: colors.divider,
    opacity: 0.6,
    pointerEvents: "none",
  },
  content: {
    padding: spacing.lg,
  },
});
