import { StyleSheet, View } from "react-native";

import { colors, layoutTokens, spacing } from "@/theme/tokens";

/**
 * The short, centered grey rule. It never spans the full screen width — that
 * was the first sentence of the design brief (blueprint/02 section 3).
 */
export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  divider: {
    alignSelf: "center",
    width: layoutTokens.dividerWidth,
    maxWidth: layoutTokens.dividerMaxWidth,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.sm,
  },
});
