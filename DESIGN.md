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
world is a workshop bench in daylight: light, cool steel-and-paper surfaces
(brushed-aluminum grey, not cream), a warm brass/copper accent standing in
for the metal fittings and hand tools themselves, and a soft two-tone
gradient — warm light from one corner, cool shadow from the other — rather
than a flat white void or a decorative pattern. Data — JSON, hashes, UUIDs,
timestamps — is set in a real code/measurement face (JetBrains Mono),
because it *is* code and data, not because monospace reads as "technical."

**Revision note (this pass):** an earlier draft of this file chose a dark
ink theme and justified it from the use scene (editor-adjacent, low-glare).
A project-level frontend rule then flagged than an unprompted dark default
is itself a bias worth naming — "dark because dev tool" is a category habit
even when a scene-based reason is written after the fact, and it forecloses
the far larger share of visitors who read a light interface faster in a lit
room. This revision keeps every other decision (mode, brand, fonts, layout,
motion budget) and replaces only the value axis: light surfaces, the same
brass accent now read as sunlit metal instead of a lamp in the dark.

Explicitly refused: purple/indigo tints of any kind, cream-paper +
terracotta serif warmth, a flat white void with no atmosphere, glowing
neon edges or halos, card-grid homepage, kicker/eyebrow labels, colored
border-left accents, unicode-glyph icons, gradient text, hard offset
"neobrutalist" shadows, and — per this revision — picking either light or
dark from category habit rather than stating the reason. None of these
were pinned by the brief, so none are earned.

## Color — Restrained strategy

One accent, used only for primary actions, current-page/hover state, and
focus. Everything else is neutral steel/paper steps. No color strategy
stronger than Restrained is earned here — Operate defaults to it, and
nothing in this product asks to spend a page-scale color field.

```css
--bg: #f2f3f6;       /* page background — cool steel-grey, not cream */
--surface: #ffffff;  /* raised chrome: header, tool-panel, hover rows */

--border: rgba(15, 23, 42, 0.12);        /* hairline borders, dividers */
--border-strong: rgba(15, 23, 42, 0.22); /* input borders, focus-adjacent */

--text-primary: #14171d;
--text-secondary: #4b515c;
--text-tertiary: #6b7280;

--accent: #d99a3f;         /* brass/copper fill — buttons, self-contained */
--accent-hover: #e7ab55;
--accent-strong: #a35a17;  /* deeper copper — text/icon/border/focus use
                               directly on light surfaces (the plain
                               --accent value doesn't clear 4.5:1 as text
                               on white; this darker step does) */
--accent-ink: #241a08;     /* text set on filled accent surfaces */

--danger: #b23a26;         /* deep brick red — role="alert" text */
--success: #2f7a4d;        /* reserved; not currently used by any tool */

--focus-ring: var(--accent-strong);
```

Two surfaces only (`--bg` grey, `--surface` white) instead of a multi-step
scale: panels/header/hover-rows raise to white off the grey page, and
input/textarea fields inside a white panel sit back down on `--bg` to read
as a recessed well — the same two tokens do both jobs, reused rather than
inventing a third grey.

Contrast, checked directly (WCAG relative-luminance formula, not eyeballed):
`--text-primary` on white ≈15.6:1, `--text-secondary` ≈8:1, `--text-tertiary`
≈4.8:1, `--accent-strong` on white ≈5.2:1, `--danger` on white ≈6:1 — all
clear the 4.5:1 body-text floor (`--text-tertiary` is used only for small
meta/mono labels, never body copy). `--accent` (the lighter fill) is
intentionally *not* used as text on light surfaces — only as a button/pill
fill behind the dark `--accent-ink`, which reaches ≈7:1 on it.

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

The page background is `--bg` with two fixed, low-opacity `radial-gradient`
layers — a warm brass tint pooling from the top-left corner and a cool
slate tint pooling from the bottom-right, both fading to nothing well
before the center of the viewport. This reads as uneven daylight across a
workbench rather than a flat, single-color void, without becoming a "glow"
(no blur/halo on any element, no saturation spike — both tints sit at
10–12% opacity over neutral grey). No repeating dot/line grid: an earlier
dark-theme draft used one and the project's design-quality hook correctly
flagged it as a recognizable generated-UI signature
(`codex-grid-background`), since this app has no canvas/map/blueprint
surface to justify a measurement grid — the two-gradient approach carries
forward instead, unchanged in technique from the (already-reviewed) dark
version, just recolored. It stays fixed (no per-section change) and sits
far enough below content contrast that it never competes with scanability.

## Components

Every interactive control below defines default, hover, focus-visible, and
disabled at minimum; `role="alert"` error text is already wired per-tool and
just gets the `--danger` treatment.

- **Buttons** (`button[type="button"]` inside `.tool-panel`): filled
  `--accent` background, `--accent-ink` text, `--radius-sm`. Hover:
  `--accent-hover` + 1px lift (`translateY(-1px)`, 150ms). Disabled (PDF
  tool's Convert button): 45% opacity, no hover/lift, `not-allowed` cursor.
  This pair is self-contained (contrast is fill-vs-its-own-text) so it did
  not need to change between the dark and light passes.
- **Inputs/textareas/selects**: `--bg` fill (a visibly recessed well against
  the white `.tool-panel` around it), `1px solid --border-strong`,
  `--radius-sm`, `--font-mono` for data-bearing textareas/inputs,
  `--font-ui` for `<select>`. Focus-visible: border → `--accent-strong`,
  plus a 2px solid `--focus-ring` outline with 2px offset — a solid
  outline, never a blurred glow.
- **Rows** (home tool list): full-width button-like link rows, hairline
  `--border` divider between them, no border-left accent. Hover/focus-visible:
  background → `--surface` (white, "raised" off the grey page) with a
  soft `0 1px 3px` shadow, and an authored single-stroke SVG chevron
  (currently hidden, `opacity:0`) fades in and shifts right 2px — this is
  the one "icon," hand-drawn inline SVG, not a unicode glyph.
- **Trust pills** (home, under the tagline): white chips with hairline
  `--border-strong` borders, `--text-secondary` text, no icons, no color
  coding — they state facts, they don't need to look like achievements.
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

- **App shell header**: sticky, `--surface` (white), `1px solid --border`
  bottom edge plus a soft `0 2px 8px -4px` shadow for separation from the
  page (the page and header are close in value — grey vs. white — so the
  hairline alone reads weaker in light than it did in dark; the shadow
  restores the same crispness), compact (not hero-sized) wordmark link —
  present on every route (including tool pages) purely for wayfinding back
  to `/`.
- **Home**: left-aligned hero block (wordmark at `--text-hero`, tagline,
  trust-pill row) with generous top/bottom space, then a hairline divider,
  then the tool list as full-width rows (title + description + mono route
  tag), each a single `<Link>` — no cards, no grid.
- **Tool page** (`ToolLayout`): small muted "← GJB Toolbox" back-link, `h1`
  title, `--text-secondary` description, hairline divider, then a
  `--surface` (white) `.tool-panel` (border, soft shadow, `--radius-md`,
  padding) that contains the tool's own markup unmodified — this is where
  the per-tool form controls above apply automatically via descendant
  selectors, so no per-tool file needed markup changes.
- **Not found**: same shell, centered short message + link home, no special
  treatment.

## Accessibility

- Every control keeps its existing label/`aria-label` and `role="alert"`
  wiring (untouched — this file only adds presentation).
- Focus-visible state is a solid 2px outline everywhere, never
  color-only.
- Contrast checked against the light surfaces above (see **Color**) —
  every text role clears 4.5:1 on the surface it actually appears on.
- Respects `prefers-reduced-motion: reduce` — the three transitions above
  are removed, not slowed, and nothing else in this system depends on
  motion to convey state (fields still change color/content instantly).

## Explicitly out of scope

No dark/light toggle and no `prefers-color-scheme` auto-switching — either
would mean maintaining and re-verifying two token sets indefinitely, which
nobody has asked for; a toggle would also need a persisted preference,
which `docs/privacy.md` forbids. One committed light system, applied
everywhere, per Operate's "same button shape, same form-control
vocabulary" rule. If a future request wants system-aware theming, that is
new scope, not a gap in this pass — flag it rather than half-building it.

No per-tool visual variation beyond content.

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

**Revision (light theme correction):** a follow-up task flagged the first
pass's dark theme as an unstated bias per a project-level frontend rule
("avoid biases to dark mode," alongside the standing purple/glow/
cream-terracotta bans). This revision replaces the color-value axis only —
`--bg`/`--surface`/`--border`/`--text-*`/`--accent-strong`/`--danger` all
changed to light-appropriate values with contrast re-verified — and leaves
mode, direction thesis, fonts, layout, component structure, and motion
budget untouched. See the **Direction** section's revision note for the
reasoning.
