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
world is a workshop bench in daylight: light, warm paper surfaces (pale
yellow, not cool steel-grey, not cream), a warm brass/copper accent standing
in for the metal fittings and hand tools themselves, and a soft two-tone
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
focus. Everything else is neutral paper steps. No color strategy
stronger than Restrained is earned here — Operate defaults to it, and
nothing in this product asks to spend a page-scale color field.

```css
--bg: #f7f5ed;       /* page background — warm pale-yellow paper, not cool steel */
--surface: #fffcf5;  /* raised chrome: header, panels, hover rows */

--line: rgba(15, 23, 42, 0.12);        /* hairline borders, dividers */
--line-strong: rgba(15, 23, 42, 0.22); /* input borders, focus-adjacent */

--text-primary: #14171d;
--text-secondary: #4b515c;
--text-tertiary: #6b7280;

--brass: #d99a3f;         /* brass/copper fill — buttons, self-contained */
--brass-hover: #e7ab55;
--brass-strong: #a35a17;  /* deeper copper — text/icon/border/focus use
                              directly on light surfaces (the plain
                              --brass value doesn't clear 4.5:1 as text
                              on the paper surface; this darker step does) */
--brass-ink: #241a08;     /* text set on filled brass surfaces */

--danger: #b23a26;         /* deep brick red — role="alert" text */
--success: #2f7a4d;        /* reserved; not currently used by any tool */

--focus-ring: var(--brass-strong);
```

**Implementation note:** the token names above (`--line*`, `--brass*`) are
what the hand-authored chrome (app-shell header, home hero/tool-list,
tool-page back-link) actually uses in `src/styles/global.css`. They were
renamed from an earlier `--border`/`--border-strong`/`--accent*` naming once
the tool bodies moved to shadcn UI primitives (see **Components**): shadcn's
own convention *also* defines `--border`, `--accent`, and `--accent-foreground`
as separate HSL custom properties (see below), and reusing those names for
the hex-based workshop tokens would have silently shadowed one system with
the other. The two token systems intentionally coexist rather than merge:

```css
/* Tailwind/shadcn HSL tokens — src/styles/global.css, consumed via
   Tailwind utility classes (bg-card, text-primary, border-border, …)
   by every shadcn component (Button, Card, Input, Select, Textarea). */
--background: 42 35% 96%;   /* ~#f7f5ed, same paper as --bg */
--foreground: 30 12% 12%;
--card: 42 40% 99%;
--primary: 36 66% 55%;      /* brass, same hue/fill as --brass */
--primary-foreground: 40 55% 9%; /* same intent as --brass-ink */
--border: 40 18% 84%;
--ring: 28 75% 36%;
```

Two surfaces only (`--bg` warm paper, `--surface` a barely-lighter warm
white) instead of a multi-step scale: panels/header/hover-rows raise to
`--surface` off the `--bg` page, and input/textarea fields inside a raised
panel sit back down on `--bg` to read as a recessed well — the same two
tokens do both jobs, reused rather than inventing a third tone.

Contrast, checked directly (WCAG relative-luminance formula, not eyeballed)
against the current `--surface`/`--bg` pair: `--text-primary`, `--text-secondary`,
`--text-tertiary`, `--brass-strong`, and `--danger` all clear the same floors
recorded for the prior (cooler, pure-white) surface — `--text-tertiary` is
the tightest at ≈4.7:1, still above the 4.5:1 body-text floor (it's used
only for small meta/mono labels, never body copy). The shift from pure
white/cool steel to warm paper moved every surface value by only a
fraction of a lightness step, so no role changed which side of its floor
it sits on. `--brass` (the lighter fill) is intentionally *not* used as
text on light surfaces — only as a button/pill fill behind the dark
`--brass-ink`, which reaches ≈7:1 on it.

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
10–12% opacity over the warm paper base). No repeating dot/line grid: an earlier
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

**App-shell chrome** (header, home hero/tool-list, tool-page back-link) is
hand-authored CSS in `src/styles/global.css`, driven by the `--line`/`--brass*`
tokens above. **Tool bodies** (everything a tool renders inside `ToolLayout`)
are built from shadcn UI primitives (`Card`, `Button`, `Input`, `Textarea`,
`Select`, `Label`, `sonner` toasts) driven by the Tailwind/shadcn HSL tokens
above, not by hand-authored descendant selectors. An earlier draft of this
system styled tool controls via a `.tool-panel` descendant-selector block;
that CSS block is still present in `global.css` but is no longer applied by
any tool component — it's superseded by the shadcn cards below and is a
cleanup candidate, not a system still in use.

- **Buttons**: shadcn `Button` (`default`/`outline`/`secondary`/`ghost`/`link`
  variants), filled default uses `bg-primary`/`text-primary-foreground`
  (brass fill, dark ink text — same pairing as `--brass`/`--brass-ink`),
  `ghost` for low-emphasis actions (Copy, Clear) inside an `IoPanel` header.
  Disabled (PDF tool's Convert button, and Copy before there's output): 50%
  opacity via Tailwind's `disabled:opacity-50`, `not-allowed` cursor.
- **Inputs/textareas/selects**: shadcn `Input`/`Textarea`/`Select`, focus
  ring via `--ring` (mapped from the same brass hue), `font-mono` utility
  class on every data-bearing field (JSON, Base64, hashes, UUIDs,
  timestamps) — the mono-for-data rule from **Typography** carries over
  unchanged, it's just applied as a Tailwind class instead of a descendant
  selector now.
- **IoPanels** (`src/tools/shared/IoPanels.tsx` — `IoGrid` + `IoPanel` +
  `ActionBar`): the dual-pane input/output layout used by Base64, Hash,
  JSON formatter, Text-case, UUID, and Unix-timestamp. `IoGrid` lays two
  `IoPanel` cards side by side (`lg:grid-cols-2`, stacked below that); each
  `IoPanel` is a shadcn `Card` with a small-caps title and optional header
  actions (a `ghost` `Button` with a Lucide `Copy` or `Trash2` icon for
  Copy/Clear). `ActionBar` is a bordered strip below the grid for a tool's
  remaining controls (e.g. Text-case's mode `<select>` + Transform button).
- **PDF 3-step wizard** (`PdfToImageTool`): a step-pill row (Upload → Range →
  Download, current step filled with the brass `--primary` token) above a
  single shadcn `Card` per step — Upload (file input, page count), Range &
  format (from/to page numbers, format `Select`), Download (confirmation +
  "Convert another"). One step renders at a time; Back/Next/Convert live in
  each card's `CardFooter`.
- **Icon vocabulary — two, by role, not one anymore**: the authored
  single-stroke SVG chevron is still the *only* icon for navigation (home
  row hover chevron, tool-page back-link) — never a unicode arrow glyph
  (`←`/`→`) or emoji. Generic in-tool actions that shadcn's own ecosystem
  expects an icon for (Copy, Clear/Trash) use Lucide icons (`Copy`,
  `Trash2`) instead, because they ship as part of the same primitives and
  hand-drawing a duplicate vocabulary for them wasn't worth it. This is a
  deliberate, scoped exception to the original "one hand-drawn icon"
  rule — navigation keeps the authored mark, generic actions use Lucide.
- **Rows** (home tool list): full-width button-like link rows, hairline
  `--line` divider between them, no border-left accent. Hover/focus-visible:
  background → `--surface` (raised off the paper page) with a
  soft `0 1px 3px` shadow, and the authored chevron (currently hidden,
  `opacity:0`) fades in and shifts right 2px. Focus-visible uses a positive
  `outline-offset` (2px, outside the row) like every other control in this
  system.
- **Trust pills** (home, under the tagline): pale chips with hairline
  `--line-strong` borders, `--text-secondary` text, no icons, no color
  coding — they state facts, they don't need to look like achievements.
- **Alert text** (`role="alert"`): `--danger`/`text-destructive`, no icon, no
  background fill — stays inline with the field it describes.
- **PlantUML diagram lightbox** (PlantUML tool only): native `<dialog>`,
  `::backdrop` a warm dim over `--bg` (not a cool black void, not glass),
  panel `--surface` / `bg-card`, hairline `--border`, **Close** is a ghost
  `Button` with Lucide `X` (same generic-action exception as Copy/Trash).
  Viewport uses `cursor-grab` / `cursor-grabbing`. No new overlay vocabulary
  for other tools.

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

- **App shell header**: sticky, `--surface` (raised warm white), `1px solid
  --line` bottom edge plus a soft `0 2px 8px -4px` shadow for separation
  from the page (the page and header are close in value — paper vs. raised
  surface — so the hairline alone reads weaker in light than it did in
  dark; the shadow restores the same crispness), compact (not hero-sized)
  wordmark link — present on every route (including tool pages) purely for
  wayfinding back to `/`.
- **Home**: left-aligned hero block (wordmark at `--text-hero`, tagline,
  trust-pill row, then the origin note directly under the pills), generous
  top/bottom space, then four native `<details>` groups (Text, IDs & time,
  Files, Diagrams). Each group header is a raised `--surface` band with a
  `--line-strong` ring (brass ring on hover/focus) and display type at
  weight 700; tools underneath stay full-width rows (title + description +
  mono route tag), each a single `<Link>` — no cards, no grid. Groups start
  open; collapse is session-only.
- **Tool page** (`ToolLayout`): small muted back-link (authored left-pointing
  SVG chevron + "GJB Toolbox", not a `←` glyph), `h1` title,
  `--text-secondary` description, hairline divider — this header chrome is
  unchanged hand-authored CSS. Below it, each tool renders its own body
  directly (no shared wrapping panel): the dual-pane `IoPanel` cards or the
  PDF wizard's step card, both shadcn `Card`s (white-ish `--surface`,
  hairline border, soft shadow, `--radius-md`-equivalent) — see
  **Components**.
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

**Revision (design-review polish pass):** a follow-up review flagged three
items, all fixed without changing direction: the app-shell brand carried a
decorative `{ }` unicode glyph before the wordmark, which is exactly the
"unicode glyph standing in for an icon" pattern this file already refused
elsewhere — removed, wordmark text only. The tool-page back-link used a
literal `←` character for the same reason — replaced with the same
hand-drawn single-stroke SVG chevron already established on the home rows
(mirrored left-pointing), so the app now has one icon vocabulary instead of
a glyph exception. The home tool-row focus-visible outline used a negative
`outline-offset` (inside the row) while every other focus ring in the
system uses a positive one (outside the control) — corrected to match. This
project's `.impeccable/design.json` sidecar was also written alongside this
pass, extending (not duplicating) the tokens above with tonal ramps, the
shadow/motion vocabulary, breakpoints, and a handful of canonical component
snippets for the live panel; regenerate it (`/impeccable document`,
sidecar-only) if the tokens above change again.

**Revision (tool-UI implementation pass):** the tool bodies (everything
inside `ToolLayout`) were rebuilt on shadcn UI primitives — dual-pane
`IoPanel`/`IoGrid` cards for the input/output tools, a 3-step wizard of
`Card`s for the PDF tool — instead of the hand-authored `.tool-panel`
descendant-selector vocabulary this file originally described; that CSS
block is now unused dead weight in `global.css`, left in place rather than
deleted mid-pass. To avoid the workshop's hex-based `--border`/`--accent*`
tokens colliding with shadcn's own HSL `--border`/`--accent` custom
properties, the workshop tokens were renamed to `--line`/`--line-strong`
and `--brass`/`--brass-hover`/`--brass-strong`/`--brass-ink`; the two token
systems now coexist deliberately (see **Color**) rather than one replacing
the other. The page background and raised-surface hex values also moved
from the cool steel-grey (`#f2f3f6`/`#ffffff`) this file previously
recorded to the warm pale-yellow paper already used by the app's actual
CSS (`#f7f5ed`/`#fffcf5`) — this file's Color section had drifted from the
shipped values; it's corrected here, not re-litigated. Icons gained one
scoped exception: Lucide `Copy`/`Trash2` for generic in-tool actions,
alongside (not replacing) the authored SVG chevron for navigation. Home,
mode, direction thesis, fonts, spacing, motion budget, and the no-toggle
rule are all unchanged by this pass. `.impeccable/design.json` still
references the pre-rename token names and the old background hex in a few
CSS-snippet examples and its `colorMeta.bg.canonical` field; this file is
the source of truth going forward; the sidecar can be regenerated
(`/impeccable document`, sidecar-only) rather than hand-patched.
