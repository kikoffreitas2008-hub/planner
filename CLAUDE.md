# CLAUDE.md — Planner

You are building **Planner**, a personal productivity and planning app for iPhone and
desktop web. This folder currently contains only a blueprint. The app gets built here.

## Read before writing any code

| File | What it settles |
| --- | --- |
| `blueprint/01-product-spec.md` | Every screen and behaviour. The source of truth for *what*. |
| `blueprint/02-design-system.md` | Colours, typography, the card, spacing, scale. The source of truth for *how it looks*. |
| `blueprint/03-architecture.md` | Stack, and the reasoning behind each choice. |
| `blueprint/04-data-model.md` | Entities, fields, derived views, sync semantics. |
| `blueprint/05-build-plan.md` | Milestone order. Follow it. |
| `blueprint/06-lessons-and-discipline.md` | Failure modes from the previous build. Read this one properly — it is the reason this rebuild exists. |

`blueprint/reference/` holds working code from the previous build that is worth reusing.
`blueprint/reference/domain/*.ts` in particular is pure, dependency-free TypeScript that
already encodes the hard rules (recurrence, ordering, progress, time zones, duration
parsing). Read it and lift what fits; it saves days. Everything else in `reference/` is
context, not a template.

## Non-negotiables

**Disk.** The previous build reached 3.35 GB for ~3 MB of source. Never point a package
cache, browser download, or tool home directory inside this project. No `work/` scratch
folder — use the OS temp directory. Keep exactly one build output. `node_modules` and
`dist` are gitignored and disposable; nothing else in the repo may exceed a few MB.

**Git.** `git init` before the first file, and commit at the end of every milestone. The
previous project has zero commits after 10+ hours of work. Do not repeat that.

**Order.** Local-first, then sync. Do not introduce Supabase, auth, or any network call
before Milestone 4. Milestones 0–3 must run with no account and no internet.

**Scope.** Build what `01-product-spec.md` describes. It is already the product of a long
requirements conversation with the owner — the decisions in it are settled, not
suggestions. If something genuinely seems wrong, say so in one sentence and continue.

**Ask before adding a dependency.** Each one is a maintenance cost and a chunk of disk.
Expo's own modules are free; a third-party library needs a reason.

## Language and locale

- All UI copy, code, comments and commits in **US English**.
- Locale conventions stay Portuguese: `dd/mm/yyyy`, 24-hour clock, week starts Monday,
  time zone `Europe/Lisbon`.
- The owner speaks Portuguese. Talk to them in Portuguese; write the code in English.

## Verification

Run these before claiming a milestone is done, and paste the real output:

```bash
npx tsc --noEmit
npm run lint
npm test
```

Then actually open the app (`npm run web`) and look at the screen you changed. Tests
passing is not the same as the feature working — the previous build had 220 green tests
while creating a project silently saved nothing.
