import { Tabs } from "expo-router/js-tabs";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, typography } from "@/theme/tokens";
import { PlatformIcon } from "@/components/ui/PlatformIcon";

// Height of the icon + label row itself; the home-indicator inset is added on top.
const TAB_BAR_CONTENT_HEIGHT = 56;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Honour the bottom inset on every platform. It is 0 in a desktop browser and
  // ~34 in an installed iOS PWA, where the home indicator would otherwise sit on
  // top of the icons. Applied once: the bar grows by the inset and reserves the
  // same amount as padding, so the row stays centred above the indicator
  // (blueprint/06 section 5 — the previous build applied it twice).
  const bottomInset = insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          height: TAB_BAR_CONTENT_HEIGHT + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 0,
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarLabelStyle: {
          fontSize: typography.caption.fontSize,
          fontWeight: typography.caption.fontWeight,
        },
        tabBarItemStyle: {
          // Centre the icon + label group vertically within the content row.
          paddingTop: 6,
          paddingBottom: 6,
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
