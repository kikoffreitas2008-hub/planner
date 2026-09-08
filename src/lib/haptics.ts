// A thin, safe wrapper around `expo-haptics`.
//
// Haptics are a native-only affordance: iOS Safari and the installed PWA have
// no Web Vibration equivalent for the Taptic Engine, so on web every call
// here is a no-op. It also stays silent when the user has turned on Reduce
// Motion (blueprint/01) — that setting covers "less physical feedback", not
// just animation. Callers can fire these freely from press handlers without
// guarding the platform themselves.
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

import { getDatabase } from "@/data/store";

/** The kinds of feedback the app uses, mapped to Expo's API in `run()`. */
export type HapticKind = "light" | "medium" | "selection" | "success" | "warning";

function enabled(): boolean {
  if (Platform.OS === "web") return false;
  return getDatabase().user_settings?.reduce_motion !== true;
}

export function haptic(kind: HapticKind): void {
  if (!enabled()) return;
  // Fire-and-forget: a rejected haptic (unsupported device, permission)
  // must never surface to the caller or the UI.
  const run = (): Promise<unknown> => {
    switch (kind) {
      case "light":
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case "medium":
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      case "selection":
        return Haptics.selectionAsync();
      case "success":
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case "warning":
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };
  void run().catch(() => {});
}
