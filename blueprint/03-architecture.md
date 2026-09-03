# Architecture

The previous build worked. This document explains what to keep from it, what to replace,
and why. Every "replace" here comes from something that actually cost time or disk in that
build — not from taste.

> **Verify before committing.** Library APIs move. Before building on any third-party
> package named here, check its current version and API. If something has changed
> materially, say so and propose the adjustment rather than forcing the shape below.

---

## 1. Keep

**Expo + React Native + TypeScript.** One codebase for an iPhone app and a desktop web
app. This was the right call and nothing about it caused trouble.

**Expo Router.** File-based routing that works on both targets, with typed routes. Keep the
route names in the app's own vocabulary; the previous build kept Portuguese route paths
(`/hoje`, `/projetos`, `/calendario`) after switching the UI to English. For a fresh build
just use `/today`, `/projects`, `/calendar`.

**Supabase.** Postgres, auth and row-level security on a free tier that comfortably covers
four users. The old project's Supabase instance already exists and its keys are in
`Documents/Codex/2026-08-29/eu-x20/.env` — reuse the project or create a new one, but do
not commit that file.

**PWA delivery.** "Add to Home Screen" from Safari gives a real full-screen app icon for
free. Native distribution through TestFlight or the App Store needs a paid Apple Developer
account (99 USD/year) and is a later decision, not a v1 requirement.

**Row-level security from the start.** Every synced row carries `user_id`, and policies
restrict read and write to the owner. `reference/sql/` has the previous migrations —
useful as a reference for policy shape, not as something to copy wholesale.

---

## 2. Replace: drop PowerSync

The previous build used PowerSync with a local SQLite database, syncing to Supabase.

**Why it goes:**

- It is a **third vendor** in the stack, whose free instance **sleeps after a week of
  inactivity** — for a personal app that is a real failure mode.
- Its React Native Web support was flagged beta, and made the web build carry
  `wa-sqlite` WASM files that had to be copied into `public/` (9 MB of committed build
  artefacts).
- On native it pulls `@op-engineering/op-sqlite`, a large native module.
- Between `@powersync/common`, `@powersync/react-native`, `@powersync/web`, `wa-sqlite`
  and `op-sqlite`, it accounts for a large share of a 990 MB `node_modules`.
- All of that buys sync robustness at a scale this app will never reach. The requirement
  is: one person, two devices, last-write-wins.

**What replaces it:** an in-memory store, persisted locally, syncing directly against
Supabase.

### Preferred approach — Legend-State v3 with `syncedSupabase`

Legend-State gives observable state, automatic local persistence, an offline change queue
with retry, and a first-party Supabase sync plugin that works off `updated_at` plus a soft
delete column — precisely the conflict model the spec already calls for. No extra service,
no WASM, no native SQLite module.

Persistence: `localStorage` / IndexedDB on web, MMKV or AsyncStorage on native.

### Fallback — write the sync layer

If the library's API has drifted, or it fights the data model, hand-rolling is genuinely
tractable here and is roughly 300 lines:

- a store (Zustand or plain observables) holding all entities in memory
- persist the store to local storage on change, debounced
- an **outbox**: every mutation appends `{ table, id, payload, updated_at }`
- a **pusher** that drains the outbox to Supabase with exponential backoff
- a **puller** that fetches `where updated_at > lastPulledAt` per table on reconnect and
  on realtime events
- conflict rule: newest `updated_at` wins; a tombstone beats an older edit

The old spec called self-built sync "substantially riskier", and for a general-purpose
sync engine that is true. It is not true for single-user last-write-wins over ten tables.

### No local SQLite

Store everything in memory and persist as JSON. Realistic ceiling for this app after five
years of daily use is a few thousand rows — a couple of megabytes. Derive the agenda,
ordering, progress and search index in TypeScript from the in-memory data.

This deletes an entire layer: no SQL schema, no migrations on device, no `agenda_items`
view, no WASM on web, no native SQLite binding.

**Revisit if** the dataset passes roughly 20,000 items or startup becomes visibly slow. The
fix then is `expo-sqlite` with a query layer, and nothing above the data layer changes.

---

## 3. Replace: email codes instead of magic links

The previous build used Supabase magic links. They cost hours across several rounds:

- links expiring before the owner opened them
- the built-in email service capping at **2 emails per hour** (429s), which needed a Brevo
  SMTP account to fix
- PKCE only completing in the browser that started the flow, so opening the email on
  another device consumed the link without creating a session — "fixed" by switching web
  to the implicit flow
- and finally: opening the link in Safari **cannot hand a session to the home-screen app**,
  because the installed PWA has a separate storage context. Signing in worked in Safari and
  the installed icon still showed the sign-in page. This was the last unresolved bug.

**Use `signInWithOtp` and `verifyOtp` with a 6-digit code.** The user types the code inside
the app, so the session is created in the app's own storage context. No redirect, no PKCE
versus implicit, no cross-device link consumption, no standalone-PWA boundary. Every one of
those failure modes disappears.

Configuration notes:

- The Supabase email template must include `{{ .Token }}`, not only `{{ .ConfirmationURL }}`.
- Keep a custom SMTP sender (Brevo's free tier is 300 emails/day) — the built-in service's
  2/hour limit is not usable.
- Store the session explicitly in `localStorage` on web and `expo-secure-store` on native.

**Defer Apple Sign-In.** It needs a Service ID, a redirect URI, an edge function for token
exchange and a native module, and on iOS it only matters once there is a native build,
which needs the paid Apple account. Add it when the app goes to TestFlight.

---

## 4. Replace: right-size the testing

The previous build produced 80 test files, 220 unit tests, a Playwright matrix across two
viewports, axe accessibility runs, a Maestro flow and an RLS harness running Postgres in
WASM — for a personal app. It cost ~700 MB of browser downloads and a large share of the
build time. And it did not prevent the bug the owner actually hit: creating a project
saved nothing, with every test green.

**Test the logic that is genuinely hard to get right, by hand or by eye:**

- recurrence generation and the three edit scopes
- ordering: chronological, by importance, and fractional-index manual order
- progress by count and by time, including items with no estimate
- duration parsing and formatting (`90`, `90min`, `1h30`, `1:30`)
- time-range validation, crossing midnight, and Lisbon DST
- daily quote selection
- overdue detection and reschedule validation
- the agenda merge of calendar items and scheduled project items

That is roughly ten files and fifty tests, all fast, none touching a browser.

**Skip in v1:** Playwright, Maestro, axe automation, the PGlite RLS harness. Verify RLS
once by hand with two accounts, and write it down.

**Instead, after every milestone, open the app and use it.** The one class of bug that
mattered — writes silently not persisting — is caught in ten seconds by hand and was
missed by 220 tests.

---

## 5. Dependency budget

Expo's own modules are effectively free; a third-party package needs a reason.

Expected: `expo`, `expo-router`, `expo-linear-gradient`, `expo-haptics`,
`expo-notifications`, `expo-secure-store`, `expo-file-system`, `expo-sharing`,
`expo-symbols`, `react-native-gesture-handler`, `react-native-reanimated`,
`react-native-safe-area-context`, `react-native-screens`, `react-native-web`,
`@supabase/supabase-js`, `fractional-indexing`, plus the state/sync library and a search
index (`minisearch` is small and did the job).

`jszip` is only needed for export — add it at Milestone 5, not before.

Not expected: anything PowerSync, any SQLite binding, Playwright, Maestro, `sql.js`,
`@electric-sql/pglite`.

---

## 6. Platform notes

**PWA.** Manifest with `display: standalone`, `start_url: "/"`, and icons at 180/192/512.
Every route must stay inside the standalone shell — all navigation client-side, no
`target="_blank"`, no full page loads. In the previous build, Today opened as an app while
Projects and Calendar fell back to showing Safari's URL bar and toolbar.

**Safe areas.** Apply the bottom inset once. Web gets zero.

**Time zone.** Everything is computed in `Europe/Lisbon`, not the device zone, so the same
account shows the same day boundaries everywhere. `reference/domain/timeRange.ts` and
`date.ts` already handle this, DST included.

**IDs.** UUIDs generated on the client, so records can be created offline.
