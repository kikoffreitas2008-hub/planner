import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { snapshotRangeAgenda } from "@/data/agenda";
import { getDatabase } from "@/data/store";
import type { DesiredNotification } from "@/domain/notificationSchedule";
import { desiredNotifications } from "@/domain/notificationSchedule";
import { nextDate, todayInLisbon } from "@/lib/today";

const WINDOW_DAYS = 30;
/** iOS caps pending local notifications at 64 (blueprint/01 §6.2). */
const MAX_PENDING = 64;
const MAX_SET_TIMEOUT_MS = 2_147_000_000; // ~24.8 days — setTimeout's practical ceiling

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") {
    return typeof Notification !== "undefined" && Notification.permission === "granted";
  }
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

/**
 * Ask for permission. Call this only when the user opts an item into its
 * first alert — never at launch (blueprint/01 §6.2).
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "web") {
    if (typeof Notification === "undefined") return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === "granted") return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === "granted";
}

function collectDesired(): readonly DesiredNotification[] {
  const today = todayInLisbon();
  let end = today;
  for (let day = 0; day < WINDOW_DAYS; day += 1) end = nextDate(end);
  const items = snapshotRangeAgenda(today, end);
  // Earliest first, capped at the device limit (domain fn already sorts by triggerAt).
  return desiredNotifications(items).slice(0, MAX_PENDING);
}

// --- web: fires while a tab or the installed PWA window is open ------------
// There is no service worker in this build, so a web alert cannot wake a
// fully closed tab — a real background push would need one. This still
// covers the common case (app open, or in another tab) per blueprint/01 §6.2
// ("Web uses browser notifications only when granted").

const webTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearWebTimers(): void {
  for (const timer of webTimers.values()) clearTimeout(timer);
  webTimers.clear();
}

function scheduleWeb(items: readonly DesiredNotification[]): void {
  clearWebTimers();
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  for (const item of items) {
    const delay = new Date(item.triggerAt).getTime() - Date.now();
    if (delay <= 0 || delay > MAX_SET_TIMEOUT_MS) continue;
    const timer = setTimeout(() => {
      webTimers.delete(item.id);
      try {
        new Notification(item.title, { body: item.body, tag: item.id });
      } catch {
        /* the tab may have lost focus/permission mid-flight */
      }
    }, delay);
    webTimers.set(item.id, timer);
  }
}

// --- native: expo-notifications ---------------------------------------

async function scheduleNative(items: readonly DesiredNotification[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const item of items) {
    await Notifications.scheduleNotificationAsync({
      identifier: item.id,
      content: { title: item.title, body: item.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(item.triggerAt),
      },
    });
  }
}

/** Recompute every pending alert from the current data and re-schedule them. */
export async function refreshNotifications(): Promise<void> {
  // The Settings master switch pauses alerts without touching per-item choices.
  const enabled = getDatabase().user_settings?.notifications_enabled ?? false;
  const granted = enabled && (await hasNotificationPermission());
  if (!granted) {
    if (Platform.OS === "web") clearWebTimers();
    else await Notifications.cancelAllScheduledNotificationsAsync();
    return;
  }
  const items = collectDesired();
  if (Platform.OS === "web") scheduleWeb(items);
  else await scheduleNative(items);
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced refresh — safe to call after every relevant edit. */
export function scheduleNotificationsRefresh(delayMs = 800): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refreshNotifications();
  }, delayMs);
  (refreshTimer as { unref?: () => void }).unref?.();
}
