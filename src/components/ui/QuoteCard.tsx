import type { ViewStyle } from "react-native";
import { Platform, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { cardTokens, colors, layoutTokens, radius, shadow, spacing, typography } from "@/theme/tokens";

export type QuoteCardProps = {
  text: string;
  reference: string;
};

/**
 * The daily verse card: glossy Apple black, white text centered both ways,
 * the reference anchored to a fixed bottom-left position so it does not drift
 * with verse length (blueprint/02 section 4). It is the hero of Today, so it
 * grows with the viewport on mobile and is capped on wide screens. The
 * verse-selection logic lands in M1 — this is the visual shell.
 */
export function QuoteCard({ text, reference }: QuoteCardProps) {
  const { height } = useWindowDimensions();
  const minHeight = Math.min(
    layoutTokens.quoteMaxHeight,
    Math.max(
      layoutTokens.quoteMinHeight,
      Math.round(height * layoutTokens.quoteViewportRatio),
    ),
  );

  return (
    <View style={[styles.card, { minHeight }]}>
      <LinearGradient
        accessible={false}
        colors={[colors.blackGlossStart, colors.blackGlossEnd]}
        start={cardTokens.gradientStart}
        end={cardTokens.gradientEnd}
        style={[StyleSheet.absoluteFill, styles.nonInteractive]}
      />
      {/* Top sheen. */}
      <LinearGradient
        accessible={false}
        colors={["rgba(255, 255, 255, 0.20)", "rgba(255, 255, 255, 0)"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.4, y: 1 }}
        style={[styles.sheen, styles.nonInteractive]}
      />
      {/* Reflection ellipse. */}
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[styles.gloss, styles.nonInteractive]}
      />
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[styles.innerHighlight, styles.nonInteractive]}
      />
      <View style={styles.center}>
        <Text style={styles.quote}>{text}</Text>
      </View>
      <Text style={styles.reference}>{reference}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    overflow: "hidden",
    borderRadius: radius.large,
    backgroundColor: colors.blackGlossStart,
    padding: spacing.xl,
    ...(Platform.OS === "web"
      ? ({ boxShadow: "0 9px 22px rgba(30, 30, 34, 0.14)" } as ViewStyle)
      : shadow.card),
  },
  sheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
  },
  gloss: {
    position: "absolute",
    top: "-46%",
    left: `${cardTokens.glossCenterX * 100 - 32}%`,
    width: "74%",
    height: "128%",
    borderRadius: radius.pill,
    backgroundColor: "#FFFFFF",
    opacity: 0.16,
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
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: spacing.xl,
  },
  quote: {
    fontSize: 25,
    lineHeight: 34,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
  },
  reference: {
    ...typography.caption,
    color: "rgba(255, 255, 255, 0.72)",
    position: "absolute",
    left: spacing.xl,
    bottom: spacing.xl,
  },
  nonInteractive: {
    pointerEvents: "none",
  },
});
