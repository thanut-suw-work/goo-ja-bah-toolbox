# Design

<!-- impeccable:design-schema 1 -->

## Mode

**Operate.** The visitor is mid-task (paste, transform, copy/download, leave).
Scanability, consistency, and native form-control behavior outrank
expression everywhere except the home hero, where the brand gets one
deliberate, contained moment before the interface returns to task mode.

## Direction

**Workshop, not dashboard.** GJB Toolbox is a small bench of hand tools you
reach for mid-task, not a SaaS product with a home screen to check daily.
**Default is cool slate** (GitHub/editor night: `#0d1117` / `#161b22`) —
an explicit product choice, not an unprompted “dark because dev tool”
default. Light remains the daylight workshop: warm pale-yellow paper,
same brass/copper accent as sunlit metal, two-tone warm/cool gradient.
Dark uses the same brass fill on a cool wash instead of warm paper glow.
Visitor cycles Dark → Light → System via one header icon. Data — JSON,
hashes, UUIDs, timestamps — is set in JetBrains Mono because it *is*
code and data.

Explicitly refused: purple/indigo tints of any kind, cream-paper +
terracotta serif warmth, a flat white void with no atmosphere, glowing
neon edges or halos, card-grid homepage, kicker/eyebrow labels, colored
border-left accents, unicode-glyph icons, gradient text, hard offset
"neobrutalist" shadows, warm-walnut “night workshop” dark (rejected in
brainstorm). None of these were pinned by the brief, so none are earned.

## Color — Restrained strategy

One accent, used only for primary actions, current-page/hover state, and
focus. Everything else is neutral paper steps. No color strategy
stronger than Restrained is earned here — Operate defaults to it, and
nothing in this product asks to spend a page-scale color field.

Dark (`:root`, default):

```css
--bg: #0d1117;
--surface: #161b22;
--line: rgba(230, 237, 243, 0.12);
--line-strong: rgba(230, 237, 243, 0.22);
--text-primary: #e6edf3;
--text-secondary: #b1bac4;
--text-tertiary: #8b949e;
--brass: #d99a3f;
--brass-hover: #e7ab55;
--brass-strong: #e7ab55; /* lightened so it clears as text/icon on slate */
--brass-ink: #241a08;
--danger: #f85149;
--success: #3fb950;
--focus-ring: var(--brass-strong);
```

Light (`html[data-theme="light"]`):

```css
--bg: #f7f5ed;
--surface: #fffcf5;
--line: rgba(15, 23, 42, 0.12);
--line-strong: rgba(15, 23, 42, 0.22);
--text-primary: #14171d;
--text-secondary: #4b515c;
--text-tertiary: #6b7280;
--brass: #d99a3f;
--brass-hover: #e7ab55;
--brass-strong: #a35a17; /* deeper copper — 4.5:1 as text on paper */
--brass-ink: #241a08;
--danger: #b23a26;
--success: #2f7a4d;
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
/* Tailwind/shadcn HSL twins — switch with data-theme alongside hex tokens.
   Dark :root ≈ --bg #0d1117 / --surface #161b22; light selector keeps
   the paper values below. Consumed via bg-card, text-primary, … */
--background: 216 28% 7%;   /* dark default; light: 42 35% 96% */
--foreground: 210 35% 93%;
--card: 215 21% 11%;
--primary: 36 66% 55%;      /* brass, same hue/fill as --brass */
--primary-foreground: 40 55% 9%;
--border: 215 14% 22%;
--ring: 36 66% 55%;
```

Two surfaces only (`--bg`, `--surface`) instead of a multi-step scale:
panels/header/hover-rows raise to `--surface` off the `--bg` page, and
input/textarea fields inside a raised panel sit back down on `--bg` to
read as a recessed well — the same two tokens do both jobs in each theme.

Contrast, checked directly (WCAG relative-luminance formula, not eyeballed)
against **both** `--surface`/`--bg` pairs. `--text-primary`, `--text-secondary`,
`--text-tertiary`, `--brass-strong`, and `--danger` must each clear 4.5:1
on the surface they actually sit on. If a named hex fails, nudge lightness
in CSS — do not invent a third theme. `--brass` (the lighter fill) is
intentionally *not* used as text on light surfaces — only as a button/pill
fill behind `--brass-ink`.

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

- **App shell header**: sticky, `--surface`, `1px solid --line` bottom edge
  plus a soft `0 2px 8px -4px` shadow (dark-tinted on slate, slate-tinted
  on paper). Compact wordmark link on every route. Trailing **theme
  toggle**: 36×36 icon button, cycle Dark → Light → System (moon / sun /
  monitor). `aria-label` and `title` `Theme: Dark|Light|System`, plus a
  visually-hidden `aria-live="polite"`. Icon swap instant — no extra
  motion. Tool pages: Back link then the toggle.
- **Home**: left-aligned hero block (wordmark at `--text-hero`, tagline,
  trust-pill row, theme-persistence sentence, then the origin note), generous
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
- Contrast checked against both token sets (see **Color**) — every text
  role clears 4.5:1 on the surface it actually appears on.
- Respects `prefers-reduced-motion: reduce` — the three transitions above
  are removed, not slowed, and nothing else in this system depends on
  motion to convey state (fields still change color/content instantly).

## Explicitly out of scope

Custom palettes, URL-based theme (`/light`, `?theme=`), and persisting
accordion or tool state remain out of scope. Theme persistence is the
`gjb-theme` enum only (`docs/privacy.md`).

No per-tool visual variation beyond content. Mermaid/PlantUML follow the
resolved app theme; PDF/SVG→image rasters do not.

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
mode, direction thesis, fonts, spacing, and motion budget were unchanged
by that pass. Theme toggle + cool-slate default landed later (see
`docs/superpowers/specs/2026-08-12-theme-design.md`). `.impeccable/design.json` still
references the pre-rename token names and the old background hex in a few
CSS-snippet examples and its `colorMeta.bg.canonical` field; this file is
the source of truth going forward; the sidecar can be regenerated
(`/impeccable document`, sidecar-only) rather than hand-patched.
