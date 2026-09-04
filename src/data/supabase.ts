import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Web/PWA session storage. A native build swaps in expo-secure-store. */
function sessionStorageAdapter() {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  } catch {
    /* private mode */
  }
  return undefined;
}

/**
 * The Supabase client, or null when no credentials are configured — in which
 * case the app stays fully local (blueprint order: sync is opt-in via .env).
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: sessionStorageAdapter(),
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export const isSyncConfigured = Boolean(url && anonKey);
