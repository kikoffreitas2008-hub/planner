# Supabase setup for Planner sync

The app runs fully local until these steps are done. Nothing here needs a paid
plan (Supabase free tier + Brevo free SMTP).

## 1. Credentials

`.env` (gitignored) already points at the existing project:

```
EXPO_PUBLIC_SUPABASE_URL=https://pillcmhgwgzvmhlcvmwh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
```

Only the **publishable / anon** key belongs here. The service-role key stays on
the server (step 4).

## 2. Schema + RLS

Supabase dashboard → **SQL Editor** → paste and run `supabase/schema.sql`.

It creates nine tables (`user_settings`, `projects`, `project_items`,
`calendar_items`, `recurrence_exceptions`, `routine_lists`, `routine_items`,
`remember_items`, `sync_tombstones`), each with `id / user_id / updated_at /
deleted_at / data(jsonb)`, RLS `user_id = auth.uid()` on every one, and a
realtime publication.

The old PowerSync tables can be left alone or dropped — the app only touches
the nine above.

## 3. Email 6-digit code sign-in

Dashboard → **Authentication → Providers → Email**: enable, keep
"Confirm email" off (OTP does its own check).

Dashboard → **Authentication → Email Templates → Magic Link** (this template is
reused for the code): make sure the body contains `{{ .Token }}` — e.g.

```
Your Planner code is {{ .Token }}
```

Dashboard → **Project Settings → Auth → SMTP**: turn on custom SMTP and point it
at Brevo (free tier, 300 emails/day). The built-in sender caps at 2/hour and is
not usable.

## 4. Account deletion function

```
supabase functions deploy delete-account
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role key>
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are provided to functions automatically.

## 5. Verify by hand (blueprint/03 §4)

- Two browsers, same account: a change in one shows in the other within a
  second.
- One browser offline (DevTools → Network → Offline): make edits, go back
  online — nothing is lost, both converge.
- Sign in with account A, create a row, sign out, sign in with account B —
  A's row is **not** visible (RLS).
- Delete account from Settings — rows gone, sign-in returns to the code screen.
