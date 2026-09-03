import type { ReactNode } from "react";
import type { ViewProps, ViewStyle } from "react-native";
import { Platform, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import {
  cardTokens,
  colors,
  layoutTokens,
  palette,
  radius,
  shadow,
  spacing,
  type PaletteKey,
} from "@/theme/tokens";

export type GlossyCardSize =
  "default" | "quote" | "task" | "project" | "remember";

export type GlossyCardProps = ViewProps & {
  children: ReactNode;
  color: PaletteKey;
  size?: GlossyCardSize;
};

const sizeStyles: Record<GlossyCardSize, ViewStyle> = {
  default: {},
  quote: { minHeight: layoutTokens.quoteMinHeight },
  task: { minHeight: layoutTokens.taskMinHeight },
  project: { minHeight: layoutTokens.projectMinHeight },
  remember: {
    minHeight: layoutTokens.rememberHeight,
  },
};

export function GlossyCard({
  children,
  color,
  size = "default",
  style,
  ...props
}: GlossyCardProps) {
  const tone = palette[color];

  return (
    <View style={[styles.shadow, sizeStyles[size], style]} {...props}>
      <LinearGradient
        accessibilityElementsHidden
        accessible={false}
        colors={[tone.start, tone.end]}
        end={cardTokens.gradientEnd}
        start={cardTokens.gradientStart}
        style={[StyleSheet.absoluteFill, styles.nonInteractive]}
      />
      {/* One soft reflection ellipse, near-centre but deliberately asymmetric. */}
      <View
        accessibilityElementsHidden
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[styles.gloss, styles.nonInteractive]}
      />
      <View
        accessibilityElementsHidden
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[styles.innerHighlight, styles.nonInteractive]}
      />
      <View
        style={[styles.content, size === "remember" && styles.rememberContent]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    position: "relative",
    overflow: "hidden",
    borderRadius: radius.large,
    backgroundColor: colors.surface,
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0 9px 22px rgba(30, 30, 34, 0.14)" } as ViewStyle)
      : shadow.card),
  },
  gloss: {
    position: "absolute",
    top: "-42%",
    left: `${cardTokens.glossCenterX * 100 - 28}%`,
    width: "66%",
    height: "118%",
    borderRadius: radius.pill,
    backgroundColor: colors.whiteGloss,
    opacity: cardTokens.glossOpacity,
    transform: [{ rotate: "-14deg" }],
  },
  innerHighlight: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 1,
    borderRadius: radius.large,
    borderColor: colors.whiteHighlight,
    opacity: cardTokens.innerHighlightOpacity,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  rememberContent: {
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 0,
  },
  nonInteractive: {
    pointerEvents: "none",
  },
});
