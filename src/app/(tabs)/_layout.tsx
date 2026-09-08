import { Tabs } from "expo-router/js-tabs";
import { Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, typography } from "@/theme/tokens";
import { PlatformIcon } from "@/components/ui/PlatformIcon";

const TAB_BAR_BASE_HEIGHT = 75;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  // Apply the bottom inset exactly once, and only on native. On web the browser
  // already insets a standalone PWA's viewport, so adding our own padding here
  // just paints a blank band under the icons. The previous build applied it
  // twice and the bar was far too tall (blueprint/06 section 5).
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
          paddingTop: 0,
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarLabelStyle: {
          fontSize: typography.caption.fontSize,
          fontWeight: typography.caption.fontWeight,
        },
        // The tab button anchors its icon + label to the top of the item
        // (react-navigation's tabVerticalUiKit uses justifyContent:flex-start),
        // so extra bar height falls below it. This item wrapper is full bar
        // height; centring it here vertically centres the whole group.
        tabBarItemStyle: {
          justifyContent: "center",
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
