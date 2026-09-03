import { StyleSheet, Text } from "react-native";

import { AppScreen } from "@/components/ui/AppScreen";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import { colors, spacing, typography } from "@/theme/tokens";

export default function CalendarScreen() {
  return (
    <AppScreen
      title="Calendar"
      headerRight={
        <RoundIconButton sf="plus" ion="add" accessibilityLabel="New item" />
      }
    >
      <Text style={styles.placeholder}>
        Month, Week and Day views arrive in M3.
      </Text>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
