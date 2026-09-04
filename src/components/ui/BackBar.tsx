import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { PlatformIcon } from "@/components/ui/PlatformIcon";
import { colors, layoutTokens, spacing, typography } from "@/theme/tokens";

export type BackBarProps = {
  title: string;
  subtitle?: string;
  right?: ReactNode;
};

/** The top bar for a pushed stack screen: a back control plus the title. */
export function BackBar({ title, subtitle, right }: BackBarProps) {
  const router = useRouter();

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.bar}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={10}
          style={styles.back}
        >
          <PlatformIcon sf="chevron.left" ion="chevron-back" size={22} color={colors.text} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={styles.right}>{right}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.background,
  },
  bar: {
    width: "100%",
    maxWidth: layoutTokens.contentMaxWidth,
    alignSelf: "center",
    paddingHorizontal: layoutTokens.horizontalPadding,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    ...typography.button,
    color: colors.text,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
});
