// Supabase Edge Function — permanent account deletion (blueprint/01 §7).
// Deploy:  supabase functions deploy delete-account
// It uses the service-role key from the function's own env — never the client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TABLES = [
  "user_settings",
  "projects",
  "project_items",
  "calendar_items",
  "recurrence_exceptions",
  "routine_lists",
  "routine_items",
  "remember_items",
  "sync_tombstones",
];

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Missing Authorization", { status: 401 });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const asUser = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await asUser.auth.getUser();
  if (userError || !userData.user) return new Response("Invalid token", { status: 401 });

  const userId = userData.user.id;
  const admin = createClient(url, serviceKey);

  for (const table of TABLES) {
    const { error } = await admin.from(table).delete().eq("user_id", userId);
    if (error) return new Response(`Failed on ${table}: ${error.message}`, { status: 500 });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return new Response(deleteError.message, { status: 500 });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "content-type": "application/json" },
  });
});
