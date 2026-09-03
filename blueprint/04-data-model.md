# Data model

One set of entities lives in memory, is persisted locally, and is mirrored to Postgres.
There is no local SQL layer — see `03-architecture.md`.

`reference/domain/entities.ts` has these as TypeScript types already. `reference/sql/`
has the previous Postgres migrations, useful for column types and policy shape.

---

## 1. Common fields

Every synced entity carries:

| field | notes |
| --- | --- |
| `id` | UUID **generated on the client**, so records can be created offline |
| `user_id` | owner; every RLS policy keys off this |
| `created_at` | ISO 8601 UTC |
| `updated_at` | ISO 8601 UTC — the conflict-resolution key |
| `deleted_at` | soft delete; `null` means active |

Nothing is ever hard-deleted from the client. Everything filters on `deleted_at IS NULL`.

Manual ordering uses a **fractional index string** (`manual_sort_key`) so moving one row
never rewrites its neighbours. `fractional-indexing` provides `generateKeyBetween`.

---

## 2. Entities

### `profiles`
`display_name`, `avatar_url`, `locale`. One row per user.

### `user_settings`
`time_zone`, `week_starts_on`, `notifications_enabled`, `project_progress_visible`,
`reduce_motion`, `default_calendar_view`, `calendar_visible_anchor`,
`last_overdue_review_date`.

`last_overdue_review_date` is what stops the overdue sheet appearing more than once a day.

### `calendar_items`
Tasks and events that exist on their own — the backbone of Today and Calendar.

`item_type` (`task` | `event`), `title`, `notes`, `location`, `date`, `starts_at`,
`ends_at`, `all_day`, `completed_at`, `color`, `recurrence_rule`, `notification_offsets`,
`series_started_at`, `manual_sort_key`.

- `date` is a plain `YYYY-MM-DD` in Lisbon time; `starts_at` / `ends_at` are full
  timestamps. Keeping both makes day queries cheap and unambiguous across DST.
- `completed_at` being non-null *is* completion. Events can be completed too.
- `recurrence_rule` is stored as JSON — a rule, never expanded rows.
- `notification_offsets` is a JSON array of minutes before the start.

### `projects`
`title`, `mode` (`simple` | `structured`), `color`, `progress_mode` (`items` | `time`),
`order_mode` (`importance_default` | `manual`), `archived_at`, `manual_sort_key`.

`archived_at` non-null hides it from the active grid but keeps everything.

### `project_items`
Both tasks and subtasks, one table, self-referencing.

`project_id`, `parent_id` (null for a top-level item), `title`, `importance`
(`low` | `medium` | `high` | null), `estimated_minutes`, `notes`, `completed_at`,
`manual_sort_key`, and the optional scheduling fields: `scheduled_date`,
`scheduled_all_day`, `scheduled_starts_at`, `scheduled_ends_at`.

Scheduling is optional. When `scheduled_date` is set, the item joins the agenda.

### `routine_lists` / `routine_items`
The Morning Routine. Lists have `title`, `archived_at`, `manual_sort_key`. Items have
`routine_list_id`, `title`, `completed_at`, `manual_sort_key`.

`completed_at` persists until the user taps Reset. Nothing clears it at midnight.

### `remember_items`
`date`, `title`, `color`, `manual_sort_key`. No duration, no completion.

### `recurrence_exceptions`
`origin_id`, `occurrence_date`, `exception_type` (`cancelled` | `replaced`),
`replacement_json`.

This is how "edit only this occurrence" works without expanding a series into rows.

### `sync_tombstones`
`entity_type`, `entity_id`, `committed_at`, `expires_at`.

Written when the Undo window closes. Kept for **30 days** so a device that was offline
learns about the deletion, then removed. Deleting an account skips the wait.

---

## 3. The agenda

Today and Calendar both render **one derived list**, never a stored table. It merges:

1. `calendar_items` where `deleted_at IS NULL`
2. `project_items` where `deleted_at IS NULL` **and** `scheduled_date IS NOT NULL`, joined
   to their project for colour and project title

Each entry keeps `origin_kind` (`calendar` | `project`) and `origin_id`, so an edit made in
the Calendar writes back to the record it came from. Nothing is copied.

Then recurrence is expanded over the visible range, with `recurrence_exceptions` applied.

Ordering within a day:

1. all-day items first
2. then by `starts_at`
3. completed items last, regardless of time

`reference/domain/agenda.ts` and `recurrence.ts` implement this. The previous build did
the merge as a SQLite view named `agenda_items`; do it in TypeScript instead.

---

## 4. Sync semantics

- The UI reads and writes locally first. Every action is immediate and works offline.
- Mutations queue and drain to Supabase with exponential backoff.
- Pull uses `updated_at > lastPulledAt` per table.
- **Conflict:** the change with the newest valid `updated_at` wins.
- A tombstone beats an older edit. An edit made *after* an explicit restore produces a new
  active version.
- A failed upload stays queued. Errors needing attention surface next to the item and in a
  sync sheet in Settings.
- Local data stays readable during a backend outage **and when the session has expired**.
  Reading and writing locally continue; upload resumes after re-authentication. Do not gate
  the UI on a valid session.

---

## 5. Security

- Every table has RLS enabled with `user_id = auth.uid()` for select, insert, update and
  delete. No table is left open.
- The client only ever holds the publishable/anon key. A service-role key must never reach
  the client or the repository.
- Account deletion re-authenticates, removes the user's rows, and revokes tokens. Run it
  server-side (a Supabase edge function) so it cannot be half-completed by a client that
  goes offline.
- `.env` is gitignored. Only `EXPO_PUBLIC_*` variables belong in the client bundle.
- Verify RLS by hand once with two accounts, and write down what you checked.
