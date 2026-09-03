# Lessons from the previous build, and how to stay small

The previous build is at `Documents/Codex/2026-08-29/eu-x20`. It is a real, working app and
a lot of it is good. This file is about the parts that are not, so they do not happen twice.

---

## 1. Where 3.35 GB came from

Measured on disk. The actual source code is about **3 MB**.

| | size | what it is |
| --- | ---: | --- |
| `work/npm-cache` | 1 580 MB | a private npm cache created **inside the project** |
| `work/playwright-browsers` | 701 MB | test browsers downloaded **inside the project** |
| `node_modules` | 990 MB | dependencies, reinstallable |
| `work/*-export*` (7 folders) | ~95 MB | seven near-identical copies of iOS bundles |
| `work/bible-source` | 23.5 MB | raw Bible text, already processed into a 65 KB JSON |
| `dist` | 13 MB | one web build output |
| `public/@powersync` | 9 MB | WASM files copied out of `node_modules` and committed |
| `app` + `src` + `docs` + tests + config | **~3 MB** | **the app** |

Two decisions produced 2.3 GB of it: redirecting the npm cache and the Expo home directory
into the project (`__UNSAFE_EXPO_HOME_DIRECTORY=work/expo-home` in every npm script), and
downloading Playwright's browsers into the project
(`PLAYWRIGHT_BROWSERS_PATH=work/playwright-browsers`).

### The rules

1. **Never redirect a tool's cache or home directory into the project.** No
   `__UNSAFE_EXPO_HOME_DIRECTORY`, no project-local `npm cache`, no
   `PLAYWRIGHT_BROWSERS_PATH`. Global caches are shared across projects — that is the point
   of them.
2. **No `work/` scratch folder.** Temporary files go in the OS temp directory.
3. **Keep one build output.** `dist/` only, gitignored, deleted between builds. Never keep
   seven copies of an export "just in case".
4. **Never commit files copied out of `node_modules`.** If the web build needs an asset from
   a package, copy it at build time.
5. **Delete source material once it is processed.** The 23 MB of Bible text produced a
   65 KB JSON. Keep the JSON.
6. **Check before finishing.** If anything outside `node_modules` and `dist` exceeds a few
   MB, something is wrong.

Realistic target: **~3 MB of source, plus 400–600 MB of `node_modules`** — the latter
unavoidable for React Native, but disposable and gitignored. Without PowerSync's SQLite
bindings and without Playwright, it should land well below the old 990 MB.

### `.gitignore`

```gitignore
node_modules/
.expo/
dist/
web-build/
*.log

.env
.env.*
!.env.example

# @generated expo-cli
expo-env.d.ts
```

---

## 2. Use git

**The previous project has zero commits.** Ten-plus hours of agent work, every file
untracked. An early sandbox permission problem blocked writes to `.git` and it was never
revisited.

- `git init` **before the first source file**.
- Commit at the end of every milestone, and whenever something works.
- Never commit `.env`. Commit `.env.example` with the variable names and empty values.

---

## 3. Build order was backwards

The previous plan's first phase was "Foundation": Supabase, PowerSync, auth, sync, RLS.
Screens came after. The result was that every UI problem was entangled with session and
sync state.

The clearest symptom, reported by the owner near the end:

> "when I create a project or a to-do it doesn't save it or appear on the screen, nor with
> the routine or anything else"

The cause was the local database not being ready and the forms writing into nothing —
a data-layer state bug surfacing as a UI bug, in code where those two were inseparable.
At that moment 220 unit tests were green.

**Build local-first. Add sync last.** See `05-build-plan.md`.

---

## 4. Tests were not the problem they were meant to solve

80 test files, 220 unit tests, Playwright across two viewports, axe, Maestro, and Postgres
in WASM for RLS. None of it caught "creating a project saves nothing", because everything
was mocked at the layer where the bug lived.

Test the pure domain rules — they are genuinely tricky and cheap to cover. Then **open the
app and use it** at every milestone. See `03-architecture.md` §4.

---

## 5. Known bugs from the old build — do not reproduce

| Bug | Cause | Prevention |
| --- | --- | --- |
| Installed home-screen app showed the sign-in page even after signing in in Safari | A magic link opened in Safari cannot pass a session to the standalone PWA's separate storage context | Use 6-digit email codes typed inside the app (`03` §3) |
| "Link expired", then no emails at all | Supabase's built-in mailer allows 2 emails/hour | Custom SMTP sender; and codes, which are retried far less |
| Sign-in worked on desktop but not on another device | PKCE only completes in the browser that started the flow | Codes have no browser affinity |
| Tab bar far too tall on iPhone | The bottom safe-area inset applied more than once | Apply the inset once; zero on web |
| Creating anything saved nothing | Forms writing before the local database was ready | Local-first build order; a store that is ready synchronously |
| Pull-to-search fired while scrolling up through a page | The gesture was not gated on scroll position | Only trigger at scroll offset 0 |
| Projects and Calendar showed Safari's chrome while Today did not | Some routes were treated as outside the installed app | All navigation client-side; verify every route in standalone mode |
| Tab icons were the text characters `✓ ▦ □` | No icon set was ever added | `expo-symbols` with an `@expo/vector-icons` web fallback |

---

## 6. What the previous build got right — keep it

- **The visual system.** Approved over many rounds by the owner. Reproduce it exactly
  (`02-design-system.md`).
- **The product decisions.** They came out of a long, careful conversation. They are
  settled (`01-product-spec.md` §10).
- **The domain logic.** `reference/domain/*.ts` is pure, framework-free TypeScript covering
  recurrence, ordering, progress, duration parsing, Lisbon DST and timeline layout. This is
  the single most valuable thing carried over — read it before writing your own.
- **The curated 365 daily verses.** `assets/content/bible-quotes.en-US.json`. Already done.
- **The single-source agenda idea.** Today and Calendar reading one derived list rather
  than copying records between features. Keep this.
- **Row-level security on every table from the start.**
