# Turning on sync — step by step

The app runs fully local until this is done. Everything here is free
(Supabase free tier + Brevo free SMTP). Project: `pillcmhgwgzvmhlcvmwh`.

---

## 1 · Schema + RLS  (2 min, dashboard only)

1. https://supabase.com/dashboard → project **pillcmhgwgzvmhlcvmwh** → **SQL Editor** → **New query**.
2. Open `supabase/schema.sql` in this repo, copy the whole file, paste, **Run**.
3. It drops the old PowerSync tables and recreates 9 tables
   (`user_settings`, `projects`, `project_items`, `calendar_items`,
   `recurrence_exceptions`, `routine_lists`, `routine_items`,
   `remember_items`, `sync_tombstones`), each `id / user_id / updated_at /
   deleted_at / data(jsonb)`, with `owner_all` RLS and realtime.
4. Check: **Table Editor** shows the 9 tables; **Authentication → Policies**
   shows one policy per table.

## 2 · Email 6-digit code  (3 min, dashboard only)

1. **Authentication → Sign In / Providers → Email**: enabled = on;
   "Confirm email" = **off** (OTP verifies by itself).
2. **Authentication → Emails → Templates → Magic Link**: replace the body
   with something that includes the token, e.g.

   ```
   Your Planner code is {{ .Token }}
   ```

   (Supabase sends this same template for `signInWithOtp`; `{{ .Token }}` is
   the 6-digit code.)
3. **Project Settings → Authentication → SMTP Settings**: enable custom
   SMTP. Brevo (free, 300/day):
   - Host `smtp-relay.brevo.com`, Port `587`
   - User = your Brevo login, Password = a Brevo **SMTP key**
     (Brevo dashboard → SMTP & API → SMTP)
   - Sender = an address you verified in Brevo
   The built-in sender caps at 2 emails/hour — not usable.

   You can skip SMTP for the very first test if you sign in with the same
   email you use for the Supabase account (the built-in 2/hour is enough
   for one try), but set Brevo up before real use.

## 3 · Account-deletion function  (needs the Supabase CLI)

In a terminal (use `! <command>` in this session so the output lands here):

```
npm i -g supabase
supabase login --token <token>        # from dashboard → Account → Access Tokens
supabase link --project-ref pillcmhgwgzvmhlcvmwh
supabase functions deploy delete-account
```

No secret to set: `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` are injected into every Edge Function
automatically, and the `SUPABASE_` prefix is reserved — `supabase secrets
set SUPABASE_...` is rejected. The function reads exactly those three.

`supabase login` needs a real terminal; inside this session pass
`--token`. Revoke the token afterwards if it was pasted into the chat.

Verify it is live (401 = deployed and rejecting anonymous calls, which is
correct; 404 = not deployed):

```
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  https://pillcmhgwgzvmhlcvmwh.supabase.co/functions/v1/delete-account \
  -H "apikey: $EXPO_PUBLIC_SUPABASE_ANON_KEY"
```

This step is optional for the rest of the app — everything except
"Delete account" works without it.

---

## 4 · Verify (the M4 "done when")

1. `npm run web`, open two browser windows at the app.
2. Settings (profile button on Today) → **Sign in to sync** → your email →
   the 6-digit code → back.
3. Do the same in the second window with the **same** email.
4. Create a to-do in window A → it appears in window B within ~1 s.
5. DevTools → Network → **Offline** in window A, edit a few things, go back
   **Online** — nothing lost, both windows match.
6. Sign out, sign in with a **different** email — window A's data is not
   visible (RLS working).
