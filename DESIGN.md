# Design

<!-- impeccable:design-schema 1 -->

## Mode

**Operate.** The visitor is mid-task (paste, transform, copy/download, leave).
Scanability, consistency, and native form-control behavior outrank
expression everywhere except the home hero, where the brand gets one
deliberate, contained moment before the interface returns to task mode.

## Direction

**Workshop, not dashboard.** GJB Toolbox is a small bench of hand tools you
reach for mid-task, not a SaaS product with a home screen to check daily. The
world is a dim workshop bench at night: matte dark ink surfaces (not
near-black-plus-neon-glow — flat, unlit, no glow/blur on the accent), a
warm brass/copper accent standing in for a single work lamp, and a faint
etched grid in the background evoking pegboard/blueprint paper rather than
a decorative gradient. Data — JSON, hashes, UUIDs, timestamps — is set in a
real code/measurement face (JetBrains Mono), because it *is* code and data,
not because monospace reads as "technical."

Why dark, from the use scene (not from category habit): this tool is opened
next to an editor or terminal, often at odd hours mid-task, for short dense
reading of text (hex digests, JSON, ISO timestamps). Low-glare, high-legibility
dark surfaces suit that scene; it is not "dark because dev tool."

Explicitly refused: purple/indigo gradients, cream-paper + terracotta serif
warmth, glowing neon edges, card-grid homepage, kicker/eyebrow labels,
colored border-left accents, unicode-glyph icons, gradient text, hard
offset "neobrutalist" shadows. None of these were pinned by the brief, so
none are earned.

## Color — Restrained strategy

One accent, used only for primary actions, current-page/hover state, and
focus. Everything else is neutral ink steps. No color strategy stronger than
Restrained is earned here — Operate defaults to it, and nothing in this
product asks to spend a page-scale color field.

```css
--ink-950: #0a0c10;   /* page background */
--ink-900: #12151b;   /* app shell / header background */
--ink-800: #171b23;   /* panels: tool-panel, hero, rows */
--ink-700: #1e232d;   /* hover surface on rows/panels */
--ink-600: #2a303c;   /* borders on raised/active elements */

--line: rgba(238, 241, 246, 0.09);       /* hairline borders, dividers */
--line-strong: rgba(238, 241, 246, 0.16); /* input borders, focus-adjacent */

--text-primary: #eef1f6;
--text-secondary: #a6adba;
--text-tertiary: #6d7482;

--accent: #d99a3f;        /* brass/copper — muted, not neon */
--accent-hover: #e7ab55;
--accent-ink: #241a08;    /* text set on filled accent surfaces */

--danger: #d97462;        /* muted coral — role="alert" text */
--success: #6fb897;       /* reserved; not currently used by any tool */

--focus-ring: #e7ab55;
```

Contrast checked against `--ink-800`/`--ink-900`: `--text-primary` ≈13.5:1,
`--text-secondary` ≈7.2:1, `--accent` on `--ink-900` ≈6.8:1 — all comfortably
clear the 4.5:1 body-text floor.

## Typography

Two workhorse UI faces plus one code face, self-hosted (see **Fonts** below)
— not a display/body pair invented for flourish. Fixed rem scale, not fluid
clamp, per Operate convention; the one exception is the home hero, which
gets two explicit breakpoint sizes (still fixed values, not `clamp()`).

- **Space Grotesk** (500/600/700) — the wordmark and every heading (`h1`,
  `h2`, hero). Geometric, a little mechanical, distinct from Inter/Roboto
  without becoming a "brand font." Reason it earns a place over a system
  sans: it is the one heading face in the app, used consistently everywhere
  a heading appears, not swapped in for one hero and abandoned elsewhere.
- **IBM Plex Sans** (400/500/600) — body copy, labels, buttons, nav, list
  descriptions. A workhorse face with more character than the platform
  default, appropriate for Operate ("well served by system stacks and
  workhorse UI faces").
- **JetBrains Mono** (400/500) — every `<textarea>`/`<input>` that holds or
  produces tool data (JSON, Base64, hashes, UUIDs, timestamps), plus the
  small route tag next to each tool ("/tools/json-formatter"). This is
  content in a code/measurement face, not a "technical" costume.

```css
--font-display: 'Space Grotesk', system-ui, sans-serif;
--font-ui: 'IBM Plex Sans', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, monospace;

--text-xs: 0.75rem;    /* 12px — mono route tags, meta */
--text-sm: 0.875rem;   /* 14px — descriptions, help text */
--text-base: 1rem;     /* 16px — body, form controls */
--text-md: 1.125rem;   /* 18px — tool section headings (h2) */
--text-lg: 1.5rem;     /* 24px — tool page title (h1) */
--text-xl: 1.875rem;   /* 30px — reserved */
--text-hero-mobile: 2.5rem;  /* 40px — home brand, narrow viewport */
--text-hero: 4rem;           /* 64px — home brand, ≥640px */

--tracking-tight: -0.02em; /* headings only; floor is -0.04em, unused here */
```

Body/description measure is capped near 62ch so paragraphs (hero tagline,
tool descriptions) stay readable; data textareas are intentionally wider —
they hold structured content, not prose.

## Fonts — sourcing decision

The brief asked for expressive fonts "via Google Fonts or similar." This
project self-hosts the three faces above via `@fontsource/*` packages
(bundled through Vite, served from the same static host as the rest of the
app) instead of linking `fonts.googleapis.com` in `index.html`. This is a
deliberate deviation, not an oversight: `docs/privacy.md` already commits to
"loading static app assets (HTML/JS/CSS/workers/**fonts**) from the static
host," and a third-party Google Fonts request would hand every visitor's IP
to Google on every load — a small but real contradiction of "nothing leaves
your machine" on the very page that makes that promise. Self-hosting is the
"or similar" the brief leaves room for, and it also means the app works
fully offline after first load.

## Spacing & Radius

4px base scale: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`. More space above
a heading than below it, everywhere.

```css
--radius-sm: 6px;   /* buttons, inputs, pills */
--radius-md: 12px;  /* tool-panel, hero panel */
```

## Texture

The page background is `--ink-950` with one fixed, very low-opacity
`radial-gradient` — a soft brass-tinted glow anchored top-left, fading to
nothing past ~60% of the viewport. No repeating dot/line grid: an earlier
draft used one and the project's design-quality hook correctly flagged it as
a recognizable generated-UI signature (`codex-grid-background`), since this
app has no canvas/map/blueprint surface to justify a measurement grid. The
single soft gradient still satisfies "texture, not flat single color"
without that tell, stays fixed (no per-section change), and sits far enough
below content contrast that it never competes with scanability.

## Components

Every interactive control below defines default, hover, focus-visible, and
disabled at minimum; `role="alert"` error text is already wired per-tool and
just gets the `--danger` treatment.

- **Buttons** (`button[type="button"]` inside `.tool-panel`): filled
  `--accent` background, `--accent-ink` text, `--radius-sm`. Hover:
  `--accent-hover` + 1px lift (`translateY(-1px)`, 150ms). Disabled (PDF
  tool's Convert button): 45% opacity, no hover/lift, `not-allowed` cursor.
- **Inputs/textareas/selects**: `--ink-900` fill, `1px solid --line-strong`,
  `--radius-sm`, `--font-mono` for data-bearing textareas/inputs,
  `--font-ui` for `<select>`. Focus-visible: border → `--accent`, plus a 2px
  solid `--focus-ring` outline with 2px offset — a solid outline, never a
  blurred glow (the workshop-lamp accent stays matte).
- **Rows** (home tool list): full-width button-like link rows, hairline
  `--line` divider between them, no border-left accent. Hover/focus-visible:
  background → `--ink-700`, an authored single-stroke SVG chevron
  (currently hidden, `opacity:0`) fades in and shifts right 2px — this is
  the one "icon," hand-drawn inline SVG, not a unicode glyph.
- **Trust pills** (home, under the tagline): plain-text inline list with
  hairline pill borders, `--text-secondary`, no icons, no color coding —
  they state facts, they don't need to look like achievements.
- **Alert text** (`role="alert"`): `--danger`, `--font-ui`, no icon, no
  background fill — stays inline with the field it describes.

## Motion (exactly three)

1. **Row hover/focus** (home tool list): background fade + chevron
   fade/slide-in, 160ms ease-out.
2. **Button hover/active**: background + 1px translateY, 150ms ease-out.
3. **Input/textarea focus**: border-color transition, 120ms ease-out (the
   focus outline itself appears instantly — no delayed affordance on
   keyboard focus).

Everything else is either instant (state text swapping) or has no
transition at all. No page-load choreography; the app should feel already
there.

## Layout

- **App shell header**: sticky, `--ink-900`, `1px solid --line` bottom edge,
  compact (not hero-sized) wordmark link — present on every route
  (including tool pages) purely for wayfinding back to `/`.
- **Home**: left-aligned hero block (wordmark at `--text-hero`, tagline,
  trust-pill row) with generous top/bottom space, then a hairline divider,
  then the tool list as full-width rows (title + description + mono route
  tag), each a single `<Link>` — no cards, no grid.
- **Tool page** (`ToolLayout`): small muted "← GJB Toolbox" back-link, `h1`
  title, `--text-secondary` description, hairline divider, then a
  `--ink-800` `.tool-panel` (border, `--radius-md`, padding) that contains
  the tool's own markup unmodified — this is where the per-tool form
  controls above apply automatically via descendant selectors, so no
  per-tool file needed markup changes.
- **Not found**: same shell, centered short message + link home, no special
  treatment.

## Accessibility

- Every control keeps its existing label/`aria-label` and `role="alert"`
  wiring (untouched — this file only adds presentation).
- Focus-visible state is a solid 2px outline everywhere, never
  color-only.
- Contrast checked against the ink surfaces above (see **Color**).
- Respects `prefers-reduced-motion: reduce` — the three transitions above
  are removed, not slowed, and nothing else in this system depends on
  motion to convey state (fields still change color/content instantly).

## Explicitly out of scope

No dark/light toggle (adding one would need a persisted preference, which
`docs/privacy.md` forbids). No per-tool visual variation beyond content —
one system, applied everywhere, per Operate's "same button shape, same
form-control vocabulary" rule.

## Process note

This file was produced directly from the approved design spec and the
constraints in the implementation task, without the interactive
question/roll/finish-review ceremony `new-work.md` describes for open
creative briefs — there was no user available to answer during this
unattended plan-execution run, and the brief itself was already specific
(mode, brand name, hard visual bans, font/texture/motion budget). Treat this
as the recorded outcome of that direction, not as a substitute for review if
a human wants to critique it later via `/impeccable critique` or
`/impeccable polish`.
