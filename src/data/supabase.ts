import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** True in a real browser — not during Expo Router's Node static render. */
const inBrowser = (() => {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
})();

/**
 * The Supabase client, or null when there are no credentials or we are not in
 * a browser (the app then stays fully local). Creating the client sets up
 * refresh timers and listeners, so it must never run during SSR.
 */
export const supabase: SupabaseClient | null =
  inBrowser && url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: window.localStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;

/** Whether sync *could* run once signed in — independent of SSR. */
export const isSyncConfigured = Boolean(url && anonKey);
