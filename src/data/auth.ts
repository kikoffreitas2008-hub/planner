import { useSyncExternalStore } from "react";
import type { Session } from "@supabase/supabase-js";

import { rekeyLocalUser } from "@/data/store";
import { isSyncConfigured, supabase } from "@/data/supabase";
import { startSync, stopSync } from "@/sync/engine";
import { createSupabaseBackend } from "@/sync/supabaseBackend";

export type AuthState = {
  status: "loading" | "signed-out" | "signed-in";
  email: string | null;
  userId: string | null;
  configured: boolean;
};

let state: AuthState = {
  status: isSyncConfigured ? "loading" : "signed-out",
  email: null,
  userId: null,
  configured: isSyncConfigured,
};

const listeners = new Set<() => void>();

function set(next: AuthState): void {
  state = next;
  for (const listener of listeners) listener();
}

function enterSignedIn(session: Session): void {
  const userId = session.user.id;
  set({ status: "signed-in", email: session.user.email ?? null, userId, configured: true });
  rekeyLocalUser(userId);
  if (supabase) void startSync(createSupabaseBackend(supabase, userId));
}

function enterSignedOut(): void {
  stopSync();
  set({ status: "signed-out", email: null, userId: null, configured: isSyncConfigured });
}

if (supabase) {
  void supabase.auth.getSession().then(({ data }) => {
    if (data.session) enterSignedIn(data.session);
    else enterSignedOut();
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) enterSignedIn(session);
    else enterSignedOut();
  });
}

export function useAuth(): AuthState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );
}

/** Email a 6-digit code (blueprint/03 §3 — no magic links). */
export async function sendCode(email: string): Promise<void> {
  if (!supabase) throw new Error("Sync is not set up on this build.");
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true },
  });
  if (error) throw new Error(error.message);
}

export async function verifyCode(email: string, token: string): Promise<void> {
  if (!supabase) throw new Error("Sync is not set up on this build.");
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: "email",
  });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}

/** Server-side account deletion with the caller's token (blueprint/01 §7). */
export async function deleteAccount(): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in again to delete the account.");
  const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Account deletion failed. Try again.");
  await supabase.auth.signOut();
}
