# Design system

This visual language was arrived at over many rounds of mockups with the owner, who
approved the final result. **It is not open for redesign.** Reproduce it.

`reference/tokens.ts` and `reference/GlossyCard.tsx` are the approved system as working
code. Copy them into the new project as `src/theme/tokens.ts` and
`src/components/ui/GlossyCard.tsx` and build everything on top.

---

## 1. The direction, in the owner's words

> "A clean app without all the slop that productivity apps normally have. Light tones,
> white background, black text, grey separators that don't span the full screen width.
> Boxes in green, pink, purple, red, blue — but never very strong, and not always at 100%
> opacity. Clean, like Apple."

Refined over the mockup rounds into:

- **more Apple-like** — slightly heavier type, more three-dimensional boxes
- **glossier colours**, with a gradient from the colour toward white
- **bigger** — every section should occupy more of the screen
- the quote card **much larger**, on **glossy Apple black**
- gradients **diagonal, left to right**
- the **gloss reflection moved toward the centre — but not fully centred**
- the same card language reused on the Projects tab

`assets/screenshots/` shows the result on a 390 pt iPhone. (The captions are in
Portuguese; the app has since moved to English.)

---

## 2. Foundations

Light scheme only. There is **no global dark mode** — the background stays white. Glossy
black is reserved for the quote card and is a deliberate accent, not a theme.

```
background       #FFFFFF
surface          #FFFFFF
text             #111113
textSecondary    #68686E
divider          #D8D8DC
mutedSurface     rgba(118, 118, 128, 0.12)   ← the grey time capsules in edit mode
blackGlossStart  #08080A                     ← quote card
blackGlossEnd    #242428
whiteHighlight   rgba(255, 255, 255, 0.52)   ← card inner border
whiteGloss       rgba(255, 255, 255, 0.32)   ← the reflection
```

### Palette

Closed. Seven colours. The user picks from these and nothing else — no free colour picker.
Each has a gradient start, a gradient end, and an `ink` colour for text on it.

| | start | end | ink |
| --- | --- | --- | --- |
| blue | `#9FCCFF` | `#EAF5FF` | `#173B64` |
| green | `#AEE8C3` | `#EFFAF3` | `#17472A` |
| pink | `#F4B7D2` | `#FFF0F7` | `#633047` |
| purple | `#C9B7F6` | `#F4F0FF` | `#3F3268` |
| red | `#F4B2B2` | `#FFF0F0` | `#662C2C` |
| orange | `#F6C594` | `#FFF4E9` | `#673E1A` |
| yellow | `#F3DF96` | `#FFF9E6` | `#5D4B16` |

Colour identifies content. It never decorates a whole background.

### Typography

System font (San Francisco on Apple platforms). Weights are heavy by design — the owner
asked twice for thicker letters.

| role | size | line height | weight |
| --- | --- | --- | --- |
| title | 36 | 42 | 800 |
| heading | 23 | 29 | 700 |
| body | 17 | 23 | 600 |
| caption | 13 | 17 | 600 |
| button | 16 | 20 | 700 |

All of it must survive Dynamic Type up to 200%.

### Spacing, radius, motion

```
spacing   xxs 4 · xs 8 · sm 12 · md 16 · lg 24 · xl 32 · xxl 48
radius    small 12 · medium 18 · large 24 · pill 999
motion    quick 160ms · standard 260ms · deliberate 420ms
          spring damping 20, stiffness 190
```

Shadows are **short**, never diffuse haze:

```
card      offset 0/8   radius 18   opacity 0.14   colour #1E1E22
floating  offset 0/12  radius 26   opacity 0.18   colour #000000
```

On web, express the card shadow as `box-shadow: 0 9px 22px rgba(30,30,34,0.14)` — React
Native's shadow props do not translate.

---

## 3. The card

Every coloured surface in the app is the same component. Four layers, in order:

1. **Linear gradient**, from `start` to `end`, running **diagonally at ~135°** — from the
   bottom-left `(0, 0.88)` to the top-right `(1, 0.12)`. The transition toward white is
   deliberately *short*: most of the card keeps visible colour. (An earlier version faded
   too far to white; the owner preferred less gradient and more gloss.)
2. **Gloss** — a soft white ellipse, rotated −14°, opacity `0.34`, centred at **60% of the
   card width**. Near the centre, but deliberately asymmetric. This is the single detail the
   owner tuned most.
3. **Inner highlight** — a 1 px semi-transparent white border at `radius.large`, opacity
   `0.62`. This, plus the short shadow, is what reads as three-dimensional.
4. **Content**, padded `spacing.lg`.

Layers 1–3 are decorative: mark them `accessible={false}` and `pointerEvents: none` so they
never intercept touches or reach VoiceOver.

### Fixed heights

Scale was tuned by eye, repeatedly. These minimums matter:

| card | min height |
| --- | --- |
| quote | 210 |
| to-do | 120 |
| project | 168 |
| remember | 48 |

Cards may grow for content or accessibility. They must not shrink below these. **Remember
cards stay compact** — when to-do cards grew by 50%, the owner explicitly asked that
Remember cards go back to their smaller size.

### Layout

```
contentMaxWidth   760      ← desktop stays a readable column, never full-bleed
horizontalPadding 20
dividerWidth      72%, capped at 180 pt
```

The **divider never spans the full screen width** — it is short and centred. This was in
the very first sentence of the brief. There must be one between the quote card and the
to-do list.

---

## 4. Screen-specific rules

**Quote card.** Glossy black gradient `#08080A → #242428`, white text, a subtle highlight
at the top. The text is centred both ways. The reference is **anchored to a fixed bottom-left
position** so it does not drift with quote length.

**To-do cards.** Title left, time range `09:00 - 14:00` right, colour circle beside the
time, notes below. Completed: reduced opacity, struck-through title, check mark, moved to
the end of the list.

**Edit mode.** Time ranges move into `mutedSurface` capsules to signal editability. The
time picker is a square modal, centred, close cross top-right, Start / End toggle at the
top, scroll wheels, Save at the bottom.

**Project cards.** Square, two per row on iPhone, **fixed size — never shrink to fit more
projects**. Big centred title. With progress hidden, the title centres over the entire
card. Opening plays a short zoom, skipped under Reduce Motion.

**Tab bar.** Height 68 pt plus the bottom safe-area inset; 58 pt minimum. On web the inset
is zero — the previous build's tab bar was far too tall on the installed iPhone app
because the inset was applied twice.

Use **real icons** — `expo-symbols` (SF Symbols) on iOS with `@expo/vector-icons` as the
web fallback. The previous build shipped the literal text characters `✓`, `▦` and `□` as
tab icons, which is the one place its finish visibly slips. Suggested symbols:
`checkmark.circle.fill`, `square.grid.2x2.fill`, `calendar`.

---

## 5. Brand

`assets/brand/logo-source.png` is the logo the owner chose. `icon.png` is the derived app
icon. Generate from these: the iOS app icon, `apple-touch-icon.png` (180), `icon-192.png`,
`icon-512.png`, and the web favicon. Do not redraw the logo.
