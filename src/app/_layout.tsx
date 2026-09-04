import { useEffect } from "react";
import { AppState } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { OfflineBar } from "@/components/ui/OfflineBar";
import { UndoBar } from "@/components/ui/UndoBar";
import "@/data/auth"; // initialises the session check + sync engine when configured
import { refreshNotifications, scheduleNotificationsRefresh } from "@/data/notifications";
import { addMutationListener, flush } from "@/data/store";
import { colors } from "@/theme/tokens";

const NOTIFIABLE_TABLES = new Set(["calendar_items", "project_items", "recurrence_exceptions"]);

export default function RootLayout() {
  useEffect(() => {
    // Persist immediately whenever the app stops being active.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") flush();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Pick up whatever is already scheduled (does not request permission).
    void refreshNotifications();
    // Re-schedule whenever a relevant record changes, local or synced.
    return addMutationListener((event) => {
      if (NOTIFIABLE_TABLES.has(event.table)) scheduleNotificationsRefresh();
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" />
        </Stack>
        <OfflineBar />
        <UndoBar />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
