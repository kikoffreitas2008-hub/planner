# Time tracker — design

Date: 2026-10-08 · Status: awaiting owner review

## Purpose

The owner splits free time across three areas — University, Extras and Social —
with daily goals for the first two. Social is whatever is left and is not tracked.
The tracker answers one question at a glance: for University and for Extras, how
much time do I owe, or how much have I given beyond the goal?

## Rules

**Daily targets** (fixed in code; changed by editing a constant):

| Day | University | Extras |
| --- | --- | --- |
| Monday – Thursday | 1h | 1h 30m |
| Friday – Sunday | 2h | 0 |

**Start date:** 2026-10-09 (Friday). Days before it never count.

**Balance per area** = Σ over every logged day of (minutes given − that day's target).
Negative means owed, positive means given beyond, zero means even. Days not yet
answered do not count until answered.

**Unanswered days** = every date from the start date up to and including
yesterday (Europe/Lisbon) that has no log yet. Today is never asked about.

## Data

New synced table `time_logs`, one row per day:

```ts
interface TimeLog extends SyncEntity {
  date: ISODate;             // the day being logged
  university_minutes: number;
  extras_minutes: number;
}
```

- The row id is derived deterministically from the date (a UUID-shaped hash of
  `time-log:<date>`), so answering the same day on two devices converges on one
  row under the existing last-write-wins rule instead of creating duplicates.
- Added to the local store's tables, the sync engine's table list, and
  `supabase/schema.sql`.
- New additive script `supabase/migrations/2026-10-08-time-logs.sql` creates
  only this table (same shape, RLS policy, index and realtime publication as the
  others) — the owner runs it once in the Supabase SQL editor. It drops nothing.

## Behaviour

### End-of-day pop-up

- Shown on Today on the first launch where unanswered days exist, after the
  overdue-tasks review has been dismissed (never both at once). Separate sheet.
- Title "How was your time?"; one block per unanswered day, oldest first,
  headed like "Friday 09/10/2026". Each block has two duration fields —
  University and Extras — the existing wheel picker used for project estimates.
- Both areas are asked every day, including Friday–Sunday when the Extras
  target is 0.
- Fields start empty; an empty field saves as 0.
- **Save** writes a log for every listed day and closes.
- **✕** closes without saving; the same days are asked again on the next launch.

### Projects section

- Below the project grid (and its archived link), a section heading "Time" in
  the same style as "Remember" on Today.
- Two plain rows (no cards/boxes): area name on the left, balance on the right.
  - Owed: `−1h 30m` in red.
  - Given beyond: `+45m` in green.
  - Even: `Even` in secondary text colour.
  - Red and green come from the existing palette tokens' ink tones.
- Durations use the existing `formatDuration`.

### Correcting a log

- Tapping a row opens a sheet for that area listing logged days, newest first:
  "Fri 09/10" · given / target (e.g. `1h 15m / 2h`).
- Tapping a day opens the duration wheel for that area; Done saves the new value
  immediately (the other area's value for that day is untouched).

## Units

- `src/domain/timeTracker.ts` — pure: targets by weekday, start date,
  `targetFor(date)`, `balances(logs)`, `unansweredDays(logs, today)`,
  `formatBalance(minutes)`. Unit-tested.
- `src/data/timeLogs.ts` (+ repository entry) — `timeLogs.set(date, area values)`,
  hooks `useTimeBalances()`, `useUnansweredDays(today)`, `useTimeLogs()`.
- `src/components/time/TimeLogSheet.tsx` — the end-of-day pop-up.
- `src/components/time/TimeTrackerSection.tsx` — the Projects section.
- `src/components/time/TimeHistorySheet.tsx` — per-area list for corrections.

## Testing

- Domain tests: weekday targets, start-date boundary, balance sign and sum,
  unanswered days (gaps, today excluded, nothing before 2026-10-09).
- Store test: saving the same date twice leaves one row with the latest values.
- Run `npx tsc --noEmit`, `npm run lint`, `npm test`; then open the web app,
  answer the pop-up for a past day, and check the Projects section colours and
  a correction.

## Out of scope

Editing targets in the app, tracking Social, charts or history beyond the
correction list, reminders/notifications for the pop-up.
