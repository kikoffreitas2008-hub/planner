import { Tabs } from "expo-router/js-tabs";
import { Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, typography } from "@/theme/tokens";
import { PlatformIcon } from "@/components/ui/PlatformIcon";

const TAB_BAR_BASE_HEIGHT = 68;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Apply the bottom inset exactly once; it is zero on web. The previous build
  // applied it twice and the bar was far too tall (blueprint/06 section 5).
  const bottomInset = Platform.OS === "web" ? 0 : insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          height: TAB_BAR_BASE_HEIGHT + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 8,
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarLabelStyle: {
          fontSize: typography.caption.fontSize,
          fontWeight: typography.caption.fontWeight,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          title: "Today",
          tabBarIcon: ({ color }) => (
            <PlatformIcon sf="checkmark.circle.fill" ion="checkmark-circle" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "Projects",
          tabBarIcon: ({ color }) => (
            <PlatformIcon sf="square.grid.2x2.fill" ion="grid" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color }) => (
            <PlatformIcon sf="calendar" ion="calendar" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
