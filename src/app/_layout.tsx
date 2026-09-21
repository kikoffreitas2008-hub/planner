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
import { syncNow } from "@/sync/engine";
import { colors } from "@/theme/tokens";

const NOTIFIABLE_TABLES = new Set(["calendar_items", "project_items", "recurrence_exceptions"]);

export default function RootLayout() {
  useEffect(() => {
    // Persist locally, and push anything outstanding, the moment the app
    // stops being active — not just on the next foreground. A change made
    // right before backgrounding is normally caught by the 0ms push timer,
    // but the OS can suspend JS execution before that timer's callback runs;
    // this closes that window instead of leaving it to the next reconnect.
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        flush();
        void syncNow();
      }
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
            // Opening a task or project slides in from the right and back
            // slides out — the iOS push/pop the app previously had none of.
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="(tabs)" />
          {/* Project and task screens fade at the route level so the content's
              own zoom-in / zoom-out (see ZoomIn) reads as the transition. */}
          <Stack.Screen name="project/[id]" options={{ animation: "fade" }} />
          <Stack.Screen name="task/[id]" options={{ animation: "fade" }} />
        </Stack>
        <OfflineBar />
        <UndoBar />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
