import { StyleSheet, Text } from "react-native";

import { Touchable } from "@/components/ui/Touchable";
import { settings } from "@/data/repositories";
import { useUserSettings } from "@/data/store";
import { colors, radius, spacing, typography } from "@/theme/tokens";

/** Whether project and task cards show their progress bars. */
export function useProgressVisible(): boolean {
  return useUserSettings()?.project_progress_visible ?? true;
}

/** The "Progress" pill in a header; one setting shared by every card grid. */
export function ProgressToggle() {
  const visible = useProgressVisible();
  return (
    <Touchable
      onPress={() => settings.update({ project_progress_visible: !visible })}
      haptic="selection"
      accessibilityState={{ selected: visible }}
      style={[styles.toggle, visible && styles.toggleOn]}
    >
      <Text style={[styles.toggleText, visible && styles.toggleTextOn]}>Progress</Text>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  toggle: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    backgroundColor: colors.mutedSurface,
  },
  toggleOn: {
    backgroundColor: colors.text,
  },
  toggleText: {
    ...typography.button,
    color: colors.text,
  },
  toggleTextOn: {
    color: colors.surface,
  },
});
