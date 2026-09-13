# Planner

A personal planning app for iPhone and desktop web. Projects, a day agenda,
a month calendar, routines and a place to remember things — all in one app that
works offline and syncs across devices when you sign in.

Built with Expo (React Native + React Native Web) and TypeScript, with Supabase
for sync. Local-first: everything works with no account and no internet, and
sync is an optional layer on top.

---

## What it does

**Today.** The day's agenda, built from calendar items, project deadlines and
routines. Items can be swiped to complete or delete, with an undo bar. Anything
overdue surfaces in a review sheet instead of quietly piling up.

**Projects.** Cards with colour, importance and progress. Each project holds a
list of items, orderable by drag, with durations, dates and structured
sub-tasks. Finished projects can be archived rather than deleted.

**Calendar.** A month grid and a day timeline. Items can repeat — daily, weekly,
monthly, or on a custom rule — and a single occurrence can be edited, skipped or
detached from its series without touching the rest.

**Routines.** Recurring checklists that reset on their own schedule.

**Remember.** A lightweight list for things that have no date yet.

**Search.** One search box across projects, items and calendar entries, backed
by MiniSearch.

**Notifications.** Local reminders scheduled ahead of an item's time.

**Export.** The whole dataset as CSV inside a zip, for when you want your data
out.

---

## Architecture

The app is built in layers, and the split is deliberate:

```
src/
├── domain/      Pure TypeScript. No React, no I/O, no dependencies.
│                Recurrence, date maths, durations, progress, ordering,
│                timeline layout, notification schedules. Fully unit-tested.
├── data/        Stores, repositories, persistence, Supabase client.
├── sync/        Outbox, cursors, merge strategy, sync engine, backends.
├── components/  UI, grouped by feature.
├── app/         Screens and routing (Expo Router, file-based).
└── theme/       Design tokens — colour, type, spacing, radii.
```

The rules that are hard to get right — what "every second Tuesday" means across
a daylight-saving boundary, how an item's progress is derived, how two edits to
the same record are merged — all live in `domain/`, where they are plain
functions that can be tested without rendering anything.

**Local-first.** State lives on the device and the app is fully usable with no
account. Signing in turns on sync: local writes go to an outbox, are pushed to
Supabase, and remote changes are pulled with a cursor per table. Conflicts merge
last-write-wins per record, with tombstones for deletes.

**Locale.** The interface is in English; dates and times follow Portuguese
conventions — `dd/mm/yyyy`, 24-hour clock, weeks starting Monday, `Europe/Lisbon`.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Expo ~57, React Native 0.86, React 19 |
| Web | React Native Web, static export |
| Routing | Expo Router (typed routes) |
| Language | TypeScript |
| Sync + auth | Supabase (email 6-digit code) |
| Search | MiniSearch |
| Ordering | fractional-indexing |
| Animation | React Native Reanimated |
| Tests | Node's built-in test runner |

Dependencies are kept deliberately few. Expo's own modules are used in
preference to third-party libraries.

---

## Running it

```bash
npm install
npm run web        # browser
npm run ios        # iOS simulator or Expo Go
npm run android    # Android
```

The app runs with no configuration at all — no account, no network, no Supabase
project. Everything is stored on the device.

### Turning on sync (optional)

```bash
cp .env.example .env
```

Fill in the two values from your Supabase project:

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Only the publishable (anon) key belongs here — never a service-role key. Every
table is protected by row-level security so a user can only ever read and write
their own rows; `supabase/schema.sql` creates the tables and those policies, and
`supabase/SETUP.md` walks through the dashboard steps.

`.env` is gitignored. `.env.example` is the list of variables, with no values.

---

## Checks

```bash
npm run typecheck   # tsc --noEmit
npm run lint
npm test            # unit tests over src/**/*.test.ts
```

The tests cover the domain layer and the sync engine — the parts where being
wrong is silent. They are not a substitute for opening the app and looking at
the screen that changed.

---

## Building for the web

```bash
npm run build:web   # static export into dist/
npm run serve:web   # serve that build locally
npm run deploy:web  # publish to Cloudflare Pages
```

---

## Project layout

```
├── src/                 Application code (see Architecture above)
├── assets/              Icons, splash, brand images
├── public/              Static web files
├── scripts/             Build, serve and test helpers
├── supabase/
│   ├── schema.sql       Tables, RLS policies, realtime
│   ├── SETUP.md         Step-by-step guide to enabling sync
│   └── functions/       Edge function: account deletion
├── blueprint/           Product spec, design system, data model, build plan
├── app.json             Expo configuration
└── CLAUDE.md            Working instructions for this repository
```

`blueprint/` holds the specification the app was built from — the product spec,
the design system and the data model. It is kept in the repository because it
still describes what the app is meant to do.

---

## Authorship

A personal project, built and maintained by me and used daily as my browser
home page. Development was AI-assisted (Claude Code).

<!-- Add a screenshot here:
     ![Planner](docs/screenshot.png)  -->
