# Time Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Track daily University/Extras time against fixed weekday targets, ask for it after midnight, and show the running balance under the Projects grid.

**Architecture:** Pure rules in `src/domain/timeTracker.ts`; a new synced `time_logs` table wired through the existing local store, repositories and sync engine; three small React Native components under `src/components/time/`. Same-date rows are de-duplicated on read (latest `updated_at` wins), so two devices answering the same day never double-count.

**Tech Stack:** Expo / React Native (web + iPhone PWA), TypeScript, node:test, Supabase (jsonb `data` rows).

**Spec:** `docs/superpowers/specs/2026-10-08-time-tracker-design.md`

## Global Constraints

- All UI copy, code and comments in US English; dates shown dd/mm/yyyy; week starts Monday; time zone Europe/Lisbon.
- No new dependencies.
- Targets: Mon–Thu University 60 min, Extras 90 min; Fri–Sun University 120 min, Extras 0.
- Tracking start date: `2026-10-09`. Nothing before it counts or is asked.
- Balance colours: owed = `palette.red.ink` (#662C2C), ahead = `palette.green.ink` (#17472A), even = `colors.textSecondary`.
- Durations rendered with the existing `formatDuration` ("1 h 30 min").
- Section rows are plain text rows — no cards or boxes.
- Commit at the end of each task; messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- Same day answered twice (two devices, or pop-up then correction) → counted once, latest value wins. Pinned in Task 2's store test.
- App not opened for several days → every missed day from 09/10 to yesterday is asked, oldest first, never today. Pinned in Task 1 (`unansweredDays` gap test).
- Opening the app before the start date, or on 09/10 itself → no pop-up. Pinned in Task 1.
- Overdue-tasks review and time pop-up due on the same launch → time pop-up waits until the overdue one closes. Checked in Task 4's browser step.
- Sync before the owner runs the SQL → `time_logs` push fails and retries alone; other tables keep syncing (engine isolates per table). Owner is told to run the script; no code test.

---

### Task 1: Domain rules

**Files:**
- Create: `src/domain/timeTracker.ts`
- Test: `src/domain/timeTracker.test.ts`

**Interfaces:**
- Produces:
  - `type TimeArea = "university" | "extras"`
  - `const TIME_AREAS: readonly TimeArea[]`
  - `const TRACKING_START: ISODate` (`"2026-10-09"`)
  - `interface TimeLogLike { date: ISODate; university_minutes: number; extras_minutes: number; updated_at: string; deleted_at: string | null }`
  - `targetFor(date: ISODate, area: TimeArea): number`
  - `minutesFor(log: TimeLogLike, area: TimeArea): number`
  - `latestByDate<T extends TimeLogLike>(logs: readonly T[]): T[]` (ascending date, deleted and pre-start dropped)
  - `balanceFor(logs: readonly TimeLogLike[], area: TimeArea): number`
  - `unansweredDays(logs: readonly TimeLogLike[], today: ISODate): ISODate[]`
  - `formatBalance(minutes: number): { text: string; tone: "owed" | "ahead" | "even" }`

- [ ] **Step 1: Write the failing tests** — `src/domain/timeTracker.test.ts`

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import type { ISODate } from "./date.ts";
import {
  balanceFor,
  formatBalance,
  latestByDate,
  targetFor,
  unansweredDays,
  type TimeLogLike,
} from "./timeTracker.ts";

function log(date: string, university: number, extras: number, updatedAt = "2026-10-10T00:00:00.000Z"): TimeLogLike {
  return {
    date: date as ISODate,
    university_minutes: university,
    extras_minutes: extras,
    updated_at: updatedAt,
    deleted_at: null,
  };
}

test("targets follow the weekday", () => {
  // 2026-10-12 is a Monday, 2026-10-15 a Thursday, 2026-10-09 a Friday, 2026-10-11 a Sunday.
  assert.equal(targetFor("2026-10-12", "university"), 60);
  assert.equal(targetFor("2026-10-12", "extras"), 90);
  assert.equal(targetFor("2026-10-15", "extras"), 90);
  assert.equal(targetFor("2026-10-09", "university"), 120);
  assert.equal(targetFor("2026-10-09", "extras"), 0);
  assert.equal(targetFor("2026-10-11", "university"), 120);
});

test("balance sums given minus target over logged days", () => {
  const logs = [log("2026-10-09", 90, 30), log("2026-10-12", 60, 120)];
  assert.equal(balanceFor(logs, "university"), (90 - 120) + (60 - 60));
  assert.equal(balanceFor(logs, "extras"), (30 - 0) + (120 - 90));
});

test("the same day logged twice counts once, latest wins", () => {
  const logs = [
    log("2026-10-09", 30, 0, "2026-10-10T01:00:00.000Z"),
    log("2026-10-09", 150, 0, "2026-10-10T02:00:00.000Z"),
  ];
  assert.equal(latestByDate(logs).length, 1);
  assert.equal(balanceFor(logs, "university"), 150 - 120);
});

test("deleted rows and days before the start never count", () => {
  const deleted = { ...log("2026-10-12", 600, 0), deleted_at: "2026-10-13T00:00:00.000Z" };
  const logs = [log("2026-10-08", 600, 600), deleted];
  assert.equal(balanceFor(logs, "university"), 0);
});

test("unanswered days run from the start to yesterday, skipping logged ones", () => {
  const logs = [log("2026-10-10", 0, 0)];
  assert.deepEqual(unansweredDays(logs, "2026-10-13"), ["2026-10-09", "2026-10-11", "2026-10-12"]);
});

test("nothing is asked on or before the start date", () => {
  assert.deepEqual(unansweredDays([], "2026-10-08"), []);
  assert.deepEqual(unansweredDays([], "2026-10-09"), []);
  assert.deepEqual(unansweredDays([], "2026-10-10"), ["2026-10-09"]);
});

test("balance text and tone", () => {
  assert.deepEqual(formatBalance(-90), { text: "−1 h 30 min", tone: "owed" });
  assert.deepEqual(formatBalance(45), { text: "+45 min", tone: "ahead" });
  assert.deepEqual(formatBalance(0), { text: "Even", tone: "even" });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test 2>&1 | grep -E "timeTracker|✖" | head`
Expected: FAIL — cannot find module `./timeTracker.ts`.

- [ ] **Step 3: Implement** — `src/domain/timeTracker.ts`

```ts
import type { ISODate } from "./date.ts";
import { formatDuration } from "./duration.ts";
import { nextLocalDate } from "./overdue.ts";

export type TimeArea = "university" | "extras";

export const TIME_AREAS: readonly TimeArea[] = ["university", "extras"];

/** The first day that counts. Nothing earlier is asked about or summed. */
export const TRACKING_START = "2026-10-09" as ISODate;

/** Minutes per day: Monday–Thursday, then Friday–Sunday. */
const WEEKDAY_TARGETS: Record<TimeArea, number> = { university: 60, extras: 90 };
const WEEKEND_TARGETS: Record<TimeArea, number> = { university: 120, extras: 0 };

export interface TimeLogLike {
  date: ISODate;
  university_minutes: number;
  extras_minutes: number;
  updated_at: string;
  deleted_at: string | null;
}

export function targetFor(date: ISODate, area: TimeArea): number {
  // 0 = Monday … 6 = Sunday.
  const day = (new Date(`${date}T00:00:00.000Z`).getUTCDay() + 6) % 7;
  return (day <= 3 ? WEEKDAY_TARGETS : WEEKEND_TARGETS)[area];
}

export function minutesFor(log: TimeLogLike, area: TimeArea): number {
  return area === "university" ? log.university_minutes : log.extras_minutes;
}

/** One log per tracked day (the latest write), oldest day first. */
export function latestByDate<T extends TimeLogLike>(logs: readonly T[]): T[] {
  const byDate = new Map<string, T>();
  for (const log of logs) {
    if (log.deleted_at || log.date < TRACKING_START) continue;
    const current = byDate.get(log.date);
    if (!current || log.updated_at > current.updated_at) byDate.set(log.date, log);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function balanceFor(logs: readonly TimeLogLike[], area: TimeArea): number {
  return latestByDate(logs).reduce(
    (sum, log) => sum + minutesFor(log, area) - targetFor(log.date, area),
    0,
  );
}

/** Every day from the start up to yesterday that has no log yet. */
export function unansweredDays(logs: readonly TimeLogLike[], today: ISODate): ISODate[] {
  const logged = new Set(latestByDate(logs).map((log) => log.date));
  const days: ISODate[] = [];
  for (let day = TRACKING_START; day < today; day = nextLocalDate(day)) {
    if (!logged.has(day)) days.push(day);
  }
  return days;
}

export function formatBalance(minutes: number): { text: string; tone: "owed" | "ahead" | "even" } {
  if (minutes === 0) return { text: "Even", tone: "even" };
  const amount = formatDuration(Math.abs(minutes));
  return minutes < 0
    ? { text: `−${amount}`, tone: "owed" }
    : { text: `+${amount}`, tone: "ahead" };
}
```

- [ ] **Step 4: Run tests** — `npm test 2>&1 | grep -E "ℹ (pass|fail)|✖"` → all pass.

- [ ] **Step 5: Commit** — `git add src/domain/timeTracker.ts src/domain/timeTracker.test.ts && git commit -m "feat(time): daily targets, balance and unanswered days"`

---

### Task 2: `time_logs` table, repository, hooks, sync, SQL

**Files:**
- Modify: `src/domain/entities.ts` (add `TimeLog`)
- Modify: `src/data/db.ts` (`Table`, `Row`, `Database`, `createEmptyDatabase`)
- Modify: `src/data/store.ts` (`ALL_TABLES`)
- Modify: `src/sync/types.ts` (`SyncTableName`, `SYNC_TABLES`)
- Modify: `src/data/repositories.ts` (add `timeLogs`)
- Create: `src/data/timeLogs.ts` (hooks)
- Modify: `supabase/schema.sql` (three table arrays)
- Create: `supabase/migrations/2026-10-08-time-logs.sql`
- Modify: `docs/superpowers/specs/2026-10-08-time-tracker-design.md` (id note → de-dup on read)
- Test: `src/data/store.test.ts`

**Interfaces:**
- Consumes: Task 1 `latestByDate`, `balanceFor`, `unansweredDays`, `TIME_AREAS`, `TimeArea`.
- Produces:
  - `interface TimeLog extends SyncEntity { date: ISODate; university_minutes: number; extras_minutes: number }`
  - `timeLogs.save(date: ISODate, values: Partial<Pick<TimeLog, "university_minutes" | "extras_minutes">>): void`
  - `useTimeLogs(): readonly TimeLog[]` (latest per day, oldest first)
  - `useTimeBalances(): Record<TimeArea, number>`
  - `useUnansweredDays(today: ISODate): readonly ISODate[]`

- [ ] **Step 1: Failing store test** — append to `src/data/store.test.ts` (and add `timeLogs` to its `repositories.ts` import line)

```ts
test("saving the same day twice keeps one row with the latest values", () => {
  timeLogs.save("2026-10-09", { university_minutes: 30, extras_minutes: 0 });
  timeLogs.save("2026-10-09", { university_minutes: 150 });
  const rows = Object.values(getDatabase().time_logs).filter((row) => row.date === "2026-10-09");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].university_minutes, 150);
  assert.equal(rows[0].extras_minutes, 0, "the other area is untouched");
});
```

- [ ] **Step 2: Run** — `npm test` → FAIL (`timeLogs` undefined / `time_logs` missing).

- [ ] **Step 3: Entity** — in `src/domain/entities.ts`, after `RememberItem`:

```ts
/** Time given to the tracked areas on one day (blueprint addendum: time tracker). */
export interface TimeLog extends SyncEntity {
  date: ISODate;
  university_minutes: number;
  extras_minutes: number;
}
```

- [ ] **Step 4: Store wiring**
  - `src/data/db.ts`: import `TimeLog`; add `| "time_logs"` to `Table`; `time_logs: TimeLog;` to `Row`; `time_logs: Record<string, TimeLog>;` to `Database`; `time_logs: {},` in `createEmptyDatabase`. (No schema-version bump: `hydrate` spreads `createEmptyDatabase()` under the loaded data, so older saves get `{}`.)
  - `src/data/store.ts`: add `"time_logs"` to `ALL_TABLES` (before `"sync_tombstones"`).
  - `src/sync/types.ts`: add `| "time_logs"` to `SyncTableName` and `"time_logs"` to `SYNC_TABLES` before `"sync_tombstones"`.

- [ ] **Step 5: Repository** — `src/data/repositories.ts`, import `TimeLog`, add after `remember`:

```ts
// --- time logs ----------------------------------------------------------

export const timeLogs = {
  /** Set one day's minutes; creates the day's row the first time. */
  save(
    date: ISODate,
    values: Partial<Pick<TimeLog, "university_minutes" | "extras_minutes">>,
  ): void {
    const existing = Object.values(getDatabase().time_logs)
      .filter((row) => row.date === date && !row.deleted_at)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
    if (existing) {
      touch("time_logs", existing.id, values);
      return;
    }
    const timestamp = nowISO();
    upsertRow("time_logs", {
      id: createClientId(),
      user_id: localUserId(),
      created_at: timestamp,
      updated_at: timestamp,
      deleted_at: null,
      date,
      university_minutes: 0,
      extras_minutes: 0,
      ...values,
    });
  },
};
```

- [ ] **Step 6: Hooks** — `src/data/timeLogs.ts`

```ts
import { useMemo } from "react";

import { useTable } from "@/data/store";
import type { ISODate } from "@/domain/date";
import type { TimeLog } from "@/domain/entities";
import {
  balanceFor,
  latestByDate,
  TIME_AREAS,
  unansweredDays,
  type TimeArea,
} from "@/domain/timeTracker";

/** One log per tracked day, oldest first. */
export function useTimeLogs(): readonly TimeLog[] {
  const rows = useTable("time_logs");
  return useMemo(() => latestByDate(Object.values(rows)), [rows]);
}

export function useTimeBalances(): Record<TimeArea, number> {
  const logs = useTimeLogs();
  return useMemo(
    () =>
      Object.fromEntries(TIME_AREAS.map((area) => [area, balanceFor(logs, area)])) as Record<
        TimeArea,
        number
      >,
    [logs],
  );
}

/** Past days still waiting for an answer (the end-of-day pop-up). */
export function useUnansweredDays(today: ISODate): readonly ISODate[] {
  const logs = useTimeLogs();
  return useMemo(() => unansweredDays(logs, today), [logs, today]);
}
```

- [ ] **Step 7: SQL**
  - `supabase/schema.sql`: add `'time_logs'` to all three arrays (drop list, create list, realtime list) next to `'remember_items'`.
  - Create `supabase/migrations/2026-10-08-time-logs.sql`:

```sql
-- Adds the time tracker's table to an existing Planner database.
-- Additive only: run once in the Supabase SQL editor. Drops nothing.

create table if not exists public.time_logs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  data jsonb not null default '{}'::jsonb
);

alter table public.time_logs enable row level security;

do $$
begin
  create policy "owner_all" on public.time_logs
    for all
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
exception when duplicate_object then null;
end $$;

create index if not exists time_logs_user_updated_idx on public.time_logs (user_id, updated_at);

do $$
begin
  alter publication supabase_realtime add table public.time_logs;
exception when duplicate_object then null;
end $$;
```

- [ ] **Step 8: Spec note** — in the spec's Data section replace the deterministic-id bullet with: "Rows get ordinary client ids. Reads keep only the latest row per date (`latestByDate`), and `timeLogs.save` updates the day's existing row, so a day answered twice — even on two devices — counts once."

- [ ] **Step 9: Verify** — `npx tsc --noEmit && npm test 2>&1 | grep -E "ℹ (pass|fail)|✖"` → no errors, all pass.

- [ ] **Step 10: Commit** — `git add -A && git commit -m "feat(time): synced time_logs table, repository and hooks"`

---

### Task 3: Reusable duration field title

**Files:**
- Modify: `src/components/projects/DurationField.tsx`

**Interfaces:**
- Produces: `DurationFieldProps` gains optional `title?: string` (pop-up heading, default `"Estimated time"`) and `label?: string` (accessibility noun, default `"estimated time"`). Existing callers unchanged.

- [ ] **Step 1:** Add the two props to the type and signature (`title = "Estimated time"`, `label = "estimated time"`); replace the heading text `Estimated time` with `{title}`; replace the accessibility label with ``minutes === null ? `Set ${label}` : `${label[0].toUpperCase()}${label.slice(1)}: ${formatDuration(minutes)}` ``.
- [ ] **Step 2:** `npx tsc --noEmit` → clean.
- [ ] **Step 3: Commit** — `git commit -am "refactor(ui): let DurationField name what it measures"`

---

### Task 4: End-of-day pop-up

**Files:**
- Create: `src/components/time/TimeLogSheet.tsx`
- Modify: `src/app/(tabs)/today.tsx`

**Interfaces:**
- Consumes: `useUnansweredDays` (Task 2), `timeLogs.save` (Task 2), `DurationField` with `title`/`label` (Task 3), `TIME_AREAS`, `TimeArea` (Task 1), `formatDayHeading` from `@/lib/today`.
- Produces: `TimeLogSheet({ days: readonly ISODate[]; onClose: () => void })`.

- [ ] **Step 1: Component** — `src/components/time/TimeLogSheet.tsx`

```tsx
import { useState } from "react";
import { Modal, Platform, ScrollView, StyleSheet, Text, View } from "react-native";

import { DurationField } from "@/components/projects/DurationField";
import { Touchable } from "@/components/ui/Touchable";
import { timeLogs } from "@/data/repositories";
import type { ISODate } from "@/domain/date";
import { TIME_AREAS, type TimeArea } from "@/domain/timeTracker";
import { formatDayHeading } from "@/lib/today";
import { colors, radius, shadow, spacing, typography } from "@/theme/tokens";

export const AREA_LABELS: Record<TimeArea, string> = {
  university: "University",
  extras: "Extras",
};

type Answers = Record<string, Record<TimeArea, number | null>>;

export type TimeLogSheetProps = {
  days: readonly ISODate[];
  onClose: () => void;
};

/**
 * The after-midnight question: how much time went to each tracked area on
 * every day not yet answered. Empty saves as 0; ✕ saves nothing and the same
 * days come back on the next launch.
 */
export function TimeLogSheet({ days, onClose }: TimeLogSheetProps) {
  const [answers, setAnswers] = useState<Answers>({});

  function set(day: ISODate, area: TimeArea, minutes: number | null) {
    setAnswers((current) => ({
      ...current,
      [day]: { university: null, extras: null, ...current[day], [area]: minutes },
    }));
  }

  function save() {
    for (const day of days) {
      timeLogs.save(day, {
        university_minutes: answers[day]?.university ?? 0,
        extras_minutes: answers[day]?.extras ?? 0,
      });
    }
    onClose();
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>How was your time?</Text>
            <Touchable onPress={onClose} accessibilityLabel="Close">
              <Text style={styles.close}>✕</Text>
            </Touchable>
          </View>

          <ScrollView contentContainerStyle={styles.list}>
            {days.map((day) => (
              <View key={day} style={styles.day}>
                <Text style={styles.dayHeading}>{formatDayHeading(day)}</Text>
                {TIME_AREAS.map((area) => (
                  <View key={area} style={styles.areaRow}>
                    <Text style={styles.areaLabel}>{AREA_LABELS[area]}</Text>
                    <View style={styles.areaField}>
                      <DurationField
                        minutes={answers[day]?.[area] ?? null}
                        onChange={(minutes) => set(day, area, minutes)}
                        title={AREA_LABELS[area]}
                        label={`time on ${AREA_LABELS[area]}`}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>

          <Touchable onPress={save} haptic="success" style={styles.saveButton}>
            <Text style={styles.saveText}>Save</Text>
          </Touchable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.32)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
    maxHeight: "88%",
    padding: spacing.lg,
    gap: spacing.sm,
    ...(Platform.OS === "web" ? { boxShadow: "0 -8px 26px rgba(0,0,0,0.16)" } : shadow.floating),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  close: {
    ...typography.heading,
    color: colors.textSecondary,
  },
  list: {
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  day: {
    gap: spacing.xs,
  },
  dayHeading: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  areaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  areaLabel: {
    ...typography.body,
    color: colors.text,
    width: 96,
  },
  areaField: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: colors.text,
    borderRadius: radius.medium,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  saveText: {
    ...typography.button,
    color: colors.surface,
  },
});
```

- [ ] **Step 2: Mount on Today** — in `src/app/(tabs)/today.tsx`:
  - imports: `import { TimeLogSheet } from "@/components/time/TimeLogSheet";` and `import { useUnansweredDays } from "@/data/timeLogs";`
  - state: `const [timeLogDismissed, setTimeLogDismissed] = useState(false);` and `const unanswered = useUnansweredDays(realToday);`
  - after the `OverdueReviewSheet` block:

```tsx
      {/* After the overdue review, never on top of it. */}
      {unanswered.length > 0 &&
      !timeLogDismissed &&
      (overdue.length === 0 || overdueDismissed) ? (
        <TimeLogSheet days={unanswered} onClose={() => setTimeLogDismissed(true)} />
      ) : null}
```

- [ ] **Step 3: Verify** — `npx tsc --noEmit && npm run lint` clean. Browser (see Task 6 for the server and service-worker notes): with the date after 09/10 the sheet lists each missing day; set University on one day, Save; the sheet closes and does not return on reload. With an overdue task present, the overdue sheet shows first and the time sheet after it is dismissed.

- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(time): ask for the day's time after midnight"`

---

### Task 5: Projects section and corrections

**Files:**
- Create: `src/components/time/TimeTrackerSection.tsx`
- Create: `src/components/time/TimeHistorySheet.tsx`
- Modify: `src/app/(tabs)/projects.tsx`

**Interfaces:**
- Consumes: `useTimeBalances`, `useTimeLogs` (Task 2), `timeLogs.save` (Task 2), `formatBalance`, `targetFor`, `minutesFor`, `TIME_AREAS`, `TimeArea` (Task 1), `AREA_LABELS` (Task 4), `DurationField` (Task 3), `Divider`.
- Produces: `TimeTrackerSection()`; `TimeHistorySheet({ area: TimeArea; onClose: () => void })`.

- [ ] **Step 1: Section** — `src/components/time/TimeTrackerSection.tsx`

```tsx
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { TimeHistorySheet } from "@/components/time/TimeHistorySheet";
import { AREA_LABELS } from "@/components/time/TimeLogSheet";
import { Touchable } from "@/components/ui/Touchable";
import { useTimeBalances } from "@/data/timeLogs";
import { formatBalance, TIME_AREAS, type TimeArea } from "@/domain/timeTracker";
import { colors, palette, spacing, typography } from "@/theme/tokens";

const TONE_COLORS = {
  owed: palette.red.ink,
  ahead: palette.green.ink,
  even: colors.textSecondary,
} as const;

/** Live balance for each tracked area, under the project grid. */
export function TimeTrackerSection() {
  const balances = useTimeBalances();
  const [openArea, setOpenArea] = useState<TimeArea | null>(null);

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Time</Text>
      {TIME_AREAS.map((area) => {
        const balance = formatBalance(balances[area]);
        return (
          <Touchable
            key={area}
            variant="row"
            onPress={() => setOpenArea(area)}
            accessibilityLabel={`${AREA_LABELS[area]}: ${balance.text}`}
            style={styles.row}
          >
            <Text style={styles.area}>{AREA_LABELS[area]}</Text>
            <Text style={[styles.balance, { color: TONE_COLORS[balance.tone] }]}>
              {balance.text}
            </Text>
          </Touchable>
        );
      })}

      {openArea ? <TimeHistorySheet area={openArea} onClose={() => setOpenArea(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.xs,
  },
  heading: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  area: {
    ...typography.body,
    color: colors.text,
  },
  balance: {
    ...typography.button,
  },
});
```

- [ ] **Step 2: Corrections sheet** — `src/components/time/TimeHistorySheet.tsx`

```tsx
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { DurationField } from "@/components/projects/DurationField";
import { AREA_LABELS } from "@/components/time/TimeLogSheet";
import { Touchable } from "@/components/ui/Touchable";
import { timeLogs } from "@/data/repositories";
import { useTimeLogs } from "@/data/timeLogs";
import { formatDuration } from "@/domain/duration";
import { minutesFor, targetFor, type TimeArea } from "@/domain/timeTracker";
import { formatDayHeading } from "@/lib/today";
import { colors, radius, shadow, spacing, typography } from "@/theme/tokens";

export type TimeHistorySheetProps = {
  area: TimeArea;
  onClose: () => void;
};

/** Every logged day for one area, newest first; tap the time to correct it. */
export function TimeHistorySheet({ area, onClose }: TimeHistorySheetProps) {
  const logs = useTimeLogs();
  const newestFirst = [...logs].reverse();

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close" onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{AREA_LABELS[area]}</Text>
            <Touchable onPress={onClose} accessibilityLabel="Close">
              <Text style={styles.close}>✕</Text>
            </Touchable>
          </View>

          <ScrollView contentContainerStyle={styles.list}>
            {newestFirst.length === 0 ? (
              <Text style={styles.empty}>No days logged yet.</Text>
            ) : (
              newestFirst.map((log) => (
                <View key={log.date} style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.day}>{formatDayHeading(log.date)}</Text>
                    <Text style={styles.target}>
                      Goal {formatDuration(targetFor(log.date, area))}
                    </Text>
                  </View>
                  <View style={styles.field}>
                    <DurationField
                      minutes={minutesFor(log, area) || null}
                      onChange={(minutes) =>
                        timeLogs.save(log.date, {
                          [area === "university" ? "university_minutes" : "extras_minutes"]:
                            minutes ?? 0,
                        })
                      }
                      title={AREA_LABELS[area]}
                      label={`time on ${AREA_LABELS[area]}`}
                    />
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.32)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.large,
    borderTopRightRadius: radius.large,
    maxHeight: "80%",
    padding: spacing.lg,
    gap: spacing.sm,
    ...(Platform.OS === "web" ? { boxShadow: "0 -8px 26px rgba(0,0,0,0.16)" } : shadow.floating),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  close: {
    ...typography.heading,
    color: colors.textSecondary,
  },
  list: {
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  empty: {
    ...typography.body,
    color: colors.textSecondary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: spacing.xxs,
  },
  day: {
    ...typography.body,
    color: colors.text,
  },
  target: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  field: {
    width: 140,
  },
});
```

- [ ] **Step 3: Mount** — in `src/app/(tabs)/projects.tsx` import `Divider` and `TimeTrackerSection`; directly after `<ProjectGrid … />` add:

```tsx
      <Divider />

      <TimeTrackerSection />
```

- [ ] **Step 4: Verify** — `npx tsc --noEmit && npm run lint && npm test` clean.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(time): live balance under projects, with corrections"`

---

### Task 6: End-to-end check in the app

- [ ] **Step 1:** Make sure port 8081 is free (`netstat -ano | grep ":8081 " | grep LISTEN`; stop a leftover PID), then `CI=1 npx expo start --web --port 8081` in the background.
- [ ] **Step 2:** In the browser, unregister service workers and clear `caches` before judging anything (the PWA caches old bundles).
- [ ] **Step 3:** If the real date is before 10/10 there is nothing to ask yet. Temporarily set `TRACKING_START` to `"2026-10-05"` in `src/domain/timeTracker.ts` (do not commit), so the pop-up has past days to list; revert it with `git checkout src/domain/timeTracker.ts` after Step 4 and confirm `git status` is clean.
- [ ] **Step 4:** Check: pop-up lists missing days → Save → Projects shows University/Extras with correct red/green/"Even"; tapping University lists days with goals; changing one value updates the balance live.
- [ ] **Step 5:** Run `npx tsc --noEmit`, `npm run lint`, `npm test`; paste real output in the report. Stop the server.
- [ ] **Step 6:** Tell the owner to run `supabase/migrations/2026-10-08-time-logs.sql` once in the Supabase SQL editor.
