# Product specification

Everything below was settled in a long requirements conversation with the owner. Treat it
as decided. Where a decision has a reason worth knowing, the reason is given inline.

---

## 1. What this is

A personal productivity and planning app, built first for iPhone and also usable on a
desktop browser. The stated goal, in the owner's words, is an app **without the "slop"
that normal productivity apps have**: no ads, no social features, no gamification, no
analytics dashboards, no streaks, no AI assistant, no onboarding carousel.

It organises the day, projects and a calendar over **one source of data**. A task
scheduled inside a project appears in the Calendar and in Today. A task created in Today
appears in the Calendar. These are never copies.

It works fully offline and syncs between the owner's iPhone and computer.

Expected users: the owner, plus two or three friends. Design for that, not for scale — but
do not make choices that would need a rewrite to grow.

### Out of scope

Apple Calendar sync. Collaboration and sharing. A published Android app. Attachments,
chat, comments. Ads or tracking. In-app purchases. A global dark theme — the background
stays white; glossy black is reserved for the quote card.

The data model should leave room for future sharing (workspaces, members) without
reshaping the core entities. Do not build any of that UI.

---

## 2. Navigation

Exactly three tabs, in this order, in a bottom bar (like Instagram):

1. **Today** — the landing tab
2. **Projects**
3. **Calendar**

The bar stays visible on root views and respects the iPhone safe area. Project detail
views use stack navigation with a back button.

A **`+` button sits in the top right** of every tab, and its options change by context:

- Today → New to-do, New event, New reminder, New routine item
- Projects → New project
- Calendar → New task, New event

**Pull down at the top of any tab reveals global search.** It must only trigger when the
scroll position is already at the very top — otherwise scrolling up through a long page
opens search by accident. (This was a real bug in the previous build.) Search runs against
a local index, works offline, and finds to-dos, events, projects, project items and
reminders. Selecting a result opens its exact context.

Settings has **no tab**. A small circular profile button sits next to the `+` in Today
only.

---

## 3. Today

The main screen. Top to bottom:

1. Title **"Today"**, with the date and weekday as a subtitle beneath it.
2. Profile button and `+` button, top right.
3. **Daily quote card** — glossy black, large.
4. A short grey divider.
5. **To-do** section (tasks and events for the date).
6. **Morning Routine**.
7. **Remember**.

### 3.1 Daily quote

A large glossy-black card with white text — one Bible verse per day, with its reference.

- 365 verses ship inside the app as local data. No network call, ever.
  **`assets/content/bible-quotes.en-US.json` is that file, already curated from the World
  English Bible (public domain). Use it. Do not regenerate it** — the previous build
  downloaded 23 MB of source text to produce it.
- The verse is chosen from the device's local date, so every device of the same user shows
  the same verse. The algorithm is in `reference/domain/dailyQuote.ts`: days since a fixed
  epoch, modulo 365. The cycle never repeats within a year.
- The quote text is **always centred**, horizontally and vertically, in its area.
- The reference is **anchored to a fixed position** at the bottom left, regardless of how
  long the quote is. Short and long verses must not move it.

### 3.2 To-do list

Tasks and events for the visible date share one chronological list. All-day items come
first, then timed items ordered by start time.

Each card shows:

- title, left, as the heading
- time range on the right, format `09:00 - 14:00`
- a coloured circle next to the time — tapping it opens the colour palette
- a short description / notes underneath
- a discreet marker when the item comes from a project, or repeats

Events and tasks are visually distinguishable (icon plus a small label), but **both can be
completed** — the owner asked for this explicitly.

Completed items move to the **end of the list**, dimmed, with the title struck through and
a check mark. They stay visible for that day. Completion syncs instantly with Calendar and
Projects, because it is the same record.

### 3.3 Gestures

- **Swipe right** → complete (or re-open).
- **Swipe left** → delete, immediately, with no confirmation dialog.
- After a delete, a discreet bar appears **at the bottom**: "Item deleted — Undo".
- When the undo window closes, the item gets a syncable tombstone and is gone.
- A swipe-deleted task is never offered for rescheduling. Deleted means deleted.

Every swipe action must have an equivalent in an accessible menu.

### 3.4 Editing

Next to the **To-do** heading, on the right, two controls: **Plan tomorrow** and **Edit**.

**Edit** works like the Select button in the iOS photo gallery — it turns on an edit mode
for the whole list. In edit mode:

- each time range moves into a translucent grey capsule, signalling it is editable
- tapping a capsule opens a square modal, centred on screen
- the modal has a close cross in the top right
- at the top, two buttons: **Start time** and **End time**, switching which one you are
  setting
- the time itself is picked with native-feeling **scroll wheels**, like the Apple Calendar
- **Save** sits at the bottom
- start must be before end, unless the item deliberately crosses midnight — which needs an
  explicit confirmation (`reference/domain/timeRange.ts` implements this, including
  Lisbon DST handling)
- saving re-sorts the list automatically

The colour circle opens the closed palette. Changes apply immediately and can be reverted
while the sheet is open.

### 3.5 Plan tomorrow

Something the owner does often, so it gets its own button.

Tapping **Plan tomorrow** switches the Today screen temporarily to the next date. The
header shows the new date. Everything already scheduled for tomorrow is shown, ready to
edit — create, edit, reorder, delete. Leaving returns to today.

### 3.6 Overdue review

On the first launch after the date changes, unfinished items from previous days appear in
a review sheet. For each one:

- **Reschedule** — requires choosing **both** a new date and a new time. Not optional.
- **Keep on the original day**
- **Delete**

Items that were previously deleted never appear here. The review runs once per day; store
the last review date.

### 3.7 Morning Routine

A reusable checklist inside a white three-dimensional card.

- Tap a circle to check or uncheck.
- Swipe left deletes an item, with Undo.
- A **Reset** button at the **bottom right of the card** unchecks everything at once, so
  the list is trivially repeatable.
- State persists until Reset is tapped. **There is no automatic reset at midnight.**

### 3.8 Remember

Things to keep in mind for the day.

- Thin cards — noticeably thinner than to-do and routine cards.
- One line of text, tied to a date.
- Tap to edit; swipe left to delete with Undo.
- Can take a palette colour. No duration, no progress, no completion.

---

## 4. Projects

### 4.1 The grid

- Title **"Projects"** at the top, with a Progress toggle and the `+` button.
- **Two square cards per row** on iPhone.
- **Card size is fixed.** With more than six projects the grid keeps the same card size and
  scrolls vertically. It must never shrink cards to fit more on screen — the owner was
  explicit about this.
- Big, centred title on each card.
- The words "Simple" and "Structured" never appear on a card.
- Opening a card plays a short zoom animation. Respect Reduce Motion.
- A "Archived projects" link sits below the grid.

The **Progress** control at the top shows or hides the number and bar on every card. When
progress is hidden, the title re-centres both horizontally and vertically over the whole
card.

On desktop, cards keep a maximum width and simply form more columns.

### 4.2 Two project modes

Chosen when the project is created, never shown afterwards:

- **Simple** — opening the project goes straight to the item list.
- **Structured** — opening the project shows a grid of task cards first, in the same visual
  language at a smaller scale; each task opens its own list of subtasks.

### 4.3 The item list

On **iPhone**, a compact row per item (roughly 20–30% shorter than a comfortable default):

- completion circle
- name, prominent
- importance and duration on a second line
- an optional **Schedule** action
- notes that expand on tap

On **desktop**, the same data as a table: Name, Importance, Time, Notes, Schedule.

Both formats show the **total estimated time** at the bottom.

### 4.4 Importance and ordering

- Importance starts empty and uncoloured. Tapping offers **Low, Medium, High**.
- Default order: High → Medium → Low → none. Within a level, creation order.
- **Drag and drop creates a persistent manual order that fully overrides importance** — a
  Medium item may sit above a High one. Importance is only the starting arrangement.
- A menu option restores importance ordering.
- Manual order uses fractional index keys so moving one row never rewrites the list
  (`reference/domain/projectOrder.ts`).

### 4.5 Completion, time, progress

- Tap the circle to complete or re-open. Swipe right does the same on iPhone.
- Swipe left deletes with Undo.
- The **Time** field accepts minutes or hours and minutes and normalises to minutes
  internally — `90`, `90min`, `1h30`, `1:30` all work
  (`reference/domain/duration.ts`).
- **Schedule is optional.** When set, the item appears in the Calendar and in Today for
  that date. Leaving it empty is normal.
- Each project chooses its progress method, changeable later:
  - **by count** — completed items ÷ eligible items
  - **by time** — completed minutes ÷ estimated minutes; items with no estimate are
    excluded from the denominator and reported in project settings
- In a structured project, subtasks are the units of progress. A task with no subtasks
  counts as one unit. (`reference/domain/progress.ts`.)

### 4.6 Archiving

Finished projects are **archived, not deleted** — removed from the active grid, all data
kept, restorable. Permanent deletion is a separate action in project settings, requires
confirmation, and offers Undo before the removal syncs.

---

## 5. Calendar

The owner's brief: work exactly like the Apple Calendar app, without the slop. It is the
app's own calendar — it never asks for access to the system calendars.

### 5.1 Views

- Title **"Calendar"**.
- A **Month / Week / Day** selector next to the `+` button.
- **Month is the default view.**
- The week starts on **Monday**.
- Tapping a day immediately updates the agenda below the grid to that day.
- Week and Day use a vertical timeline with a current-time indicator.
- Overlapping items sit side by side (`reference/domain/timelineLayout.ts`).
- All-day items get their own strip above the timeline.

### 5.2 Items and interaction

Tasks, events and scheduled project items appear through one unified view. Changing
something here updates the originating record.

- `+` offers **New task** and **New event**.
- Events have: title, date, start, end, all-day, notes, optional location, colour,
  recurrence, notification.
- Tasks keep their Today fields and may belong to a project.
- Both can be completed, re-opened, moved and deleted.
- **Long press** picks an item up to move it to another time or day.
- **Handles at the edges** adjust duration.
- Tapping opens the full detail.
- Tasks and events stay distinct through icon and a small label — never through reserved
  colours.

---

## 6. Recurrence and notifications

### 6.1 Recurrence

Tasks and events accept: daily, weekdays, weekly, monthly, a custom interval, and an end
condition of never / on a date / after N occurrences.

A series is stored as **a rule plus exceptions**, not as expanded rows. Editing one
occurrence asks whether the change applies to:

- this occurrence only,
- this and all following,
- the whole series.

Completing one occurrence does not complete the series.

`reference/domain/recurrence.ts` and `recurrenceMutation.ts` already implement generation
and the three edit scopes, including month-end handling. Reuse them.

### 6.2 Notifications

- Off by default, opt-in per item.
- Quick options: at the time, 5 / 10 / 15 / 30 / 60 minutes before, one day before, custom.
- **The system permission is only requested when the user sets their first alert** — never
  on launch.
- Each device schedules its own alerts after syncing.
- Web uses browser notifications only when granted.
- iPhone periodically refreshes the window of future notifications to stay within the
  64-pending-notification system limit (`reference/domain/notificationSchedule.ts`).

---

## 7. Account, settings, export

The profile button in Today opens:

- account and sign-in method
- sync status and last completed sync
- notification preferences
- whether project progress is visible by default
- Reduce Motion
- export
- sign out
- delete account

**Export** produces a ZIP: one complete JSON file plus separate CSVs for agenda, projects
and routines.

**Delete account** requires explicit confirmation and re-authentication, removes the
personal data, and revokes tokens. Apple requires this for any App Store app that lets
users create an account — build it even though publishing is far off.

---

## 8. Offline and sync behaviour

- The UI always reads and writes locally first. Every action is instant.
- Changes are queued and pushed when a connection exists.
- No permanent sync indicator when everything is normal. Offline shows one discreet line:
  **"Offline — changes saved on this device"**.
- If two devices edit the same record offline, the most recent valid change wins.
- A tombstone beats an older edit. An edit made after explicitly restoring an item creates
  a new active version.
- Local data stays readable during a backend outage **and when the session has expired** —
  reading and writing locally continue; upload resumes after re-authentication.

Details in `04-data-model.md`.

---

## 9. Accessibility and locale

- Dynamic Type — text scales to 200% without losing essential information.
- Touch targets at least 44 × 44 points.
- VoiceOver announces action, state, time, colour and origin for each item.
- Every swipe has an accessible menu equivalent.
- Reduce Motion replaces zoom and animated drags with plain transitions.
- Colour is never the only indicator of type, importance or state.
- UI language: **US English**. "Tasks" is called **To-do**.
- Dates `dd/mm/yyyy`, 24-hour clock, week starts Monday, time zone `Europe/Lisbon`.

---

## 10. Decisions log

Short answers to questions the owner already settled, so nobody re-opens them:

| Question | Decision |
| --- | --- |
| Native or web? | Native iPhone plus a responsive web version, one codebase |
| Sync from day one? | Yes — account plus cloud sync (but see build order in `05`) |
| Calendar integration? | The app's own calendar only, no Apple Calendar |
| Daily verse source? | A curated 365-verse collection bundled offline |
| Sign-in method? | Email; Apple Sign-In deferred (see `03-architecture.md`) |
| Notifications? | Yes, opt-in per item |
| Where is `+`? | Top right, contextual per tab |
| Do Today tasks reach the Calendar? | Always, both directions, same record |
| Unfinished task at day end? | Ask; reschedule requires a new date *and* time |
| Swipe-deleted task? | Deleted outright, never offered for rescheduling |
| Completed task position? | End of the list, dimmed, struck through |
| Can project items be scheduled? | Yes, optional — never required |
| Recurrence? | Yes, with the Morning Routine kept separate as a manual checklist |
| Undo after delete? | Yes, a bar at the bottom |
| Project completion? | Archive and restore, not delete |
| Progress indicator? | Yes, with a top-level toggle to hide it |
| Progress method? | Chosen per project: by count or by time |
| Colour picker? | A closed pastel palette only — no free colour picking |
| Global search? | Yes, pull down from the top |
| Event completion in Today? | Events appear in Today and can be completed too |
| Settings location? | A profile button next to `+` in Today, not a fourth tab |
| App name | **Planner** |
