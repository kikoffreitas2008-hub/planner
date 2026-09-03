# Build plan

Six milestones. Each one ends with something the owner can open and use.

**The order matters more than anything else in this folder.** The previous build did
authentication, cloud database and sync *first*, as "Foundation", and every later UI bug
arrived tangled with session and sync state — including the one that finally broke it:
creating a project appeared to work and saved nothing.

Here, **Milestones 0–3 run with no account, no server and no internet.** The app is
complete and proven before a single network call exists.

At the end of every milestone: run the checks, open the app, use it, then commit.

---

## M0 — Skeleton

**Goal:** three empty tabs that look right.

- `npx create-expo-app` with the TypeScript + Expo Router template. Nothing else.
- `git init` and commit immediately, before anything is added.
- `.gitignore` per `06-lessons-and-discipline.md`.
- Copy `reference/tokens.ts` → `src/theme/tokens.ts` and
  `reference/GlossyCard.tsx` → `src/components/ui/GlossyCard.tsx`.
- Bottom tab bar: Today, Projects, Calendar, with **real icons** (`expo-symbols`, web
  fallback `@expo/vector-icons`). Height 68 + bottom inset, applied once.
- Screen shells: title, subtitle, profile and `+` buttons, `AppScreen` wrapper with
  `contentMaxWidth` 760.
- One `GlossyCard` on screen in each palette colour, to check the gradient, gloss and
  shadow against `assets/screenshots/`.

**Done when:** `npm run web` shows three navigable tabs at the right proportions, and the
cards match the screenshots. Committed.

---

## M1 — Today, fully local

The biggest milestone and most of the app's value. No account, no server.

- A local store holding all entities, persisted on change (`03-architecture.md` §2).
- Repositories for calendar items, routine and remember — plain functions over the store.
  Keep the data layer behind an interface so M4 can swap in sync without touching the UI.
- Copy `reference/domain/*.ts` into `src/domain/` and write the unit tests for them
  (`03-architecture.md` §4).
- **Daily quote card** — use `assets/content/bible-quotes.en-US.json` as shipped.
- **Agenda list** — create, edit, complete, delete; ordering; completed items dimmed and
  struck through at the end.
- **Swipes** — right completes, left deletes, with an Undo bar at the bottom.
- **Edit mode** — grey time capsules, the square modal with scroll wheels, Start/End
  toggle, midnight-crossing confirmation, re-sort on save.
- **Colour picker** — the closed palette, nothing else.
- **Plan tomorrow** — switches the screen to the next date and back.
- **Overdue review** — the sheet on first launch after the date changes; reschedule needs
  a new date *and* time.
- **Morning Routine** — checklist, swipe delete, Reset bottom-right, no auto reset.
- **Remember** — compact cards.

**Done when:** you can plan a real day, close the app, reopen it, and everything is still
there. Verify persistence by hand — this is exactly what broke last time. Committed.

---

## M2 — Projects, fully local

- Grid: two square fixed-size cards per row, big centred titles, scroll past six.
- Create sheet with the Simple / Structured choice, never shown afterwards.
- Simple → straight to the item list. Structured → task grid → subtask list.
- Compact rows on mobile, table on desktop, total time at the bottom.
- Importance picker; default High → Medium → Low → none.
- Drag and drop writing fractional keys, permanently overriding importance; a menu option
  restores importance order.
- Duration field accepting `90`, `90min`, `1h30`, `1:30`.
- Progress per project, by count or by time, plus the top-level show/hide toggle that
  re-centres titles when off.
- Optional **Schedule**, which puts the item into the agenda.
- Archive and restore; permanent delete behind confirmation in project settings.
- Zoom-open animation, skipped under Reduce Motion.

**Done when:** a scheduled project item appears in Today for that date, completing it in
Today shows as complete in the project, and both survive a restart. Committed.

---

## M3 — Calendar, fully local

- Month (default), Week and Day, with the selector next to `+`.
- Week starts Monday. Tapping a day updates the agenda below immediately.
- Week and Day: vertical timeline, current-time indicator, overlapping items side by side
  (`reference/domain/timelineLayout.ts`), all-day strip on top.
- The same agenda data as Today — tasks, events and scheduled project items.
- Full recurrence, with the three edit scopes
  (`reference/domain/recurrence.ts`, `recurrenceMutation.ts`).
- Long press to move; edge handles to resize.
- Item detail sheet with every event field.

**Done when:** a weekly recurring event shows correctly across a month, editing one
occurrence leaves the rest alone, and moving an item reorders Today. Committed.

---

## M4 — Account and sync

Only now does the network appear.

- Supabase project, schema and RLS on every table. Test policies by hand with two accounts.
- **Email 6-digit code sign-in** (`03-architecture.md` §3). No magic links.
- Custom SMTP sender configured; the email template must expose `{{ .Token }}`.
- Session in `localStorage` on web, `expo-secure-store` on native.
- The sync layer: outbox push with backoff, pull by `updated_at`, tombstones, last-write-wins.
- Offline line: "Offline — changes saved on this device". No permanent sync indicator.
- **Local data must stay usable with an expired session.** Never gate the UI on a session.
- Sign out, and account deletion server-side with re-authentication.

**Done when:** two browsers signed into the same account converge; one goes offline, makes
edits, comes back, and nothing is lost. Committed.

---

## M5 — Polish and delivery

- **Notifications** — per-item alerts, permission requested only at the first alert, native
  window refresh for the 64-notification limit.
- **Global search** — local index, pull down from the top **only when already at the top**.
- **Settings** — account, sync status, notifications, default progress visibility, Reduce
  Motion, export, sign out, delete account.
- **Export** — ZIP with full JSON plus CSVs for agenda, projects and routines. `jszip`
  arrives here and nowhere earlier.
- **Accessibility** — Dynamic Type to 200%, 44 pt targets, VoiceOver labels, accessible
  equivalents for every swipe, Reduce Motion honoured.
- **PWA** — manifest with `display: standalone`, icons at 180/192/512 from
  `assets/brand/`, and every route staying inside the standalone shell.

**Done when:** installed from Safari to the home screen, all three tabs open full-screen
with no Safari chrome, sign-in works inside the installed app, and it works offline in
flight mode. Committed and tagged.

---

## Later, and only on request

Apple Sign-In, an EAS native build, TestFlight and the App Store. All of it needs a paid
Apple Developer account. **Do not activate any paid service without asking.**
