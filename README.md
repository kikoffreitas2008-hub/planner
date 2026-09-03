# Planner — rebuild blueprint

This folder is everything needed to rebuild **Planner** from scratch, cleanly.

It is **not** the old project. The old project (built with Codex at
`Documents/Codex/2026-08-29/eu-x20`) works, but grew to 3.35 GB on disk, has zero git
commits, and put authentication and cloud sync before the app itself. This folder distills
what that project got *right* — the product decisions, the visual system, the tricky domain
logic — and throws away how it was built.

## How to use it

Open a terminal in this folder and start Claude Code:

```bash
cd C:\Users\kikof\Documents\Planner
claude
```

Then say:

> Read CLAUDE.md and blueprint/, then start Milestone 0.

`CLAUDE.md` is loaded automatically and points at everything else. The build plan is
`blueprint/05-build-plan.md`; it is designed so each milestone ends with something you can
open and use.

## What's in here

```
CLAUDE.md                      Instructions Claude Code loads automatically
blueprint/
  01-product-spec.md           What the app is and every behaviour it must have
  02-design-system.md          Colours, type, the card, spacing, scale rules
  03-architecture.md           Recommended stack — and why it differs from the old one
  04-data-model.md             Tables, fields, the agenda view, sync rules
  05-build-plan.md             Milestone-by-milestone build order
  06-lessons-and-discipline.md What went wrong last time; how to keep this small
  reference/
    domain/*.ts                Pure, framework-free logic worth reusing verbatim
    tokens.ts, GlossyCard.tsx  The visual system as working code
    sql/*.sql                  The old Supabase migrations, for reference only
  assets/
    brand/                     logo-source.png (the real logo) and icon.png
    content/                   365 daily Bible quotes, already curated — do not regenerate
    screenshots/               How the old build actually looked
```

Total: about 1.2 MB. Keep it that way.

## The short version of the plan

Same product. Same look. Different order and less machinery:

- **Build local-first, add sync last.** The old build did auth and cloud sync in week one,
  so every UI bug was tangled with session state.
- **Drop PowerSync.** A third vendor, WASM files, a native SQLite module and an instance
  that sleeps after a week — for an app with four users. Sync against Supabase directly.
- **Email 6-digit codes, not magic links.** Magic links cost hours and never fully worked
  in the home-screen app. A typed code has none of those failure modes.
- **Test the logic, not the pixels.** ~50 focused unit tests instead of 220 tests plus
  700 MB of browsers.
- **Commit from day one.** The old project has no history at all.

Details and reasoning in `blueprint/03-architecture.md` and
`blueprint/06-lessons-and-discipline.md`.
