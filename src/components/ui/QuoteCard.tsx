import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { cardTokens, colors, layoutTokens, radius, shadow, spacing, typography } from "@/theme/tokens";

export type QuoteCardProps = {
  text: string;
  reference: string;
};

/**
 * The daily verse card: glossy Apple black, white text centered both ways,
 * the reference anchored to a fixed bottom-left position so it does not drift
 * with verse length (blueprint/02 section 4). The verse-selection logic lands
 * in M1 — this is the visual shell.
 */
export function QuoteCard({ text, reference }: QuoteCardProps) {
  return (
    <View style={styles.card}>
      <LinearGradient
        accessible={false}
        colors={[colors.blackGlossStart, colors.blackGlossEnd]}
        start={cardTokens.gradientStart}
        end={cardTokens.gradientEnd}
        style={[StyleSheet.absoluteFill, styles.nonInteractive]}
      />
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={[styles.gloss, styles.nonInteractive]}
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
    minHeight: layoutTokens.quoteMinHeight,
    borderRadius: radius.large,
    backgroundColor: colors.blackGlossStart,
    padding: spacing.lg,
    ...shadow.card,
  },
  gloss: {
    position: "absolute",
    top: "-46%",
    left: `${cardTokens.glossCenterX * 100 - 28}%`,
    width: "66%",
    height: "120%",
    borderRadius: radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    transform: [{ rotate: "-14deg" }],
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: spacing.lg,
  },
  quote: {
    ...typography.heading,
    color: "#FFFFFF",
    textAlign: "center",
  },
  reference: {
    ...typography.caption,
    color: "rgba(255, 255, 255, 0.72)",
    position: "absolute",
    left: spacing.lg,
    bottom: spacing.lg,
  },
  nonInteractive: {
    pointerEvents: "none",
  },
});
