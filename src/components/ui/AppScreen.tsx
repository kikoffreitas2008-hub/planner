import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, layoutTokens, spacing, typography } from "@/theme/tokens";

export type AppScreenProps = {
  title: string;
  subtitle?: string;
  /** Header controls, top right (e.g. profile and `+`). */
  headerRight?: ReactNode;
  children: ReactNode;
  /** Wrap the body in a ScrollView. Default true. */
  scroll?: boolean;
};

/**
 * The shell every root tab renders inside: white background, a readable
 * centered column capped at `contentMaxWidth`, and a title/subtitle header
 * with optional controls on the right.
 */
export function AppScreen({
  title,
  subtitle,
  headerRight,
  children,
  scroll = true,
}: AppScreenProps) {
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentInsetAdjustmentBehavior="automatic"
      // iOS momentum without the "sticks then jumps" feel on a short list.
      decelerationRate="normal"
      scrollEventThrottle={16}
      overScrollMode="never"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.plainBody}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.column}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : null}
        </View>
        {body}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  column: {
    flex: 1,
    width: "100%",
    maxWidth: layoutTokens.contentMaxWidth,
    alignSelf: "center",
    paddingHorizontal: layoutTokens.horizontalPadding,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  headerText: {
    flexShrink: 1,
    // Give the title a hard right edge to truncate against so it never wraps
    // under the header controls.
    flexGrow: 1,
    marginRight: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.xxs,
    flexShrink: 0,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  plainBody: {
    flex: 1,
  },
});
