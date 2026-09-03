import { StyleSheet, Text } from "react-native";

import { AppScreen } from "@/components/ui/AppScreen";
import { RoundIconButton } from "@/components/ui/RoundIconButton";
import { colors, spacing, typography } from "@/theme/tokens";

export default function ProjectsScreen() {
  return (
    <AppScreen
      title="Projects"
      headerRight={
        <RoundIconButton sf="plus" ion="add" accessibilityLabel="New project" />
      }
    >
      <Text style={styles.placeholder}>
        The project grid arrives in M2.
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
