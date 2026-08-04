# GJB Toolbox — light prototype tool UI + home origin note

Date: 2026-08-05  
Status: approved (user waived post-write review)

**Supersedes:** `docs/superpowers/specs/2026-08-05-home-origin-note-design.md`

## Goal

Keep the live home shell (header + list). Add home origin note. Restyle every tool page to match `ui-prototype` tool chrome (cards, dual-pane where it fits, icons, toasts) in **light theme only**. Design and implement a 3-step wizard UI for PDF → Image (missing from prototype). No dark mode, no theme toggle, no theme persistence.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Home shell | Sticky header + hero + full-width tool rows (not prototype sidebar/cards) |
| Theme | Light only; no ModeToggle; no `localStorage` / `sessionStorage` for theme |
| Tool chrome approach | Lift Tailwind + minimal shadcn pieces from `ui-prototype/` into live app |
| PDF layout | 3-step wizard: Upload → Range/format → Download |
| Origin note | Under trust pills, quieter than tagline |
| Tool logic | Unchanged (`logic.ts` / `convert.ts` / `range.ts`); UI restyle only |

## Home copy

**Tagline (unchanged):**

> Small browser utilities that run entirely in this tab. Paste, get your answer, and go — nothing you enter is sent anywhere.

**Trust pills (unchanged):** No accounts · No uploads · No tracking

**Origin note (new), under pills:**

> I built this after getting stuck on apps that only accept tax invoices as images — I had a PDF.

## Stack (minimal lift)

Add to live app (not the entire prototype dependency bag):

- Tailwind CSS + PostCSS + Autoprefixer
- `class-variance-authority`, `clsx`, `tailwind-merge`
- `lucide-react`, `sonner`
- shadcn-style components only as needed: `button`, `card`, `textarea`, `input`, `label`, `select`, and `tabs` (or equivalent step UI) for PDF wizard

Do **not** add: `next-themes`, ModeToggle, theme `storageKey`, unused Radix packages, Font Awesome, framer-motion, charts, react-query.

## Architecture

- Routes, registry, lazy PDF chunk, privacy constraints: unchanged
- `AppShell`: sticky brand header; mount `<Toaster />` (sonner); no sidebar
- `ToolLayout`: back link → title (+ optional Lucide icon) → description → children
- Existing `src/styles/global.css` workshop tokens: either map into Tailwind CSS variables for light theme, or coexist (prefer mapping primary/accent so one system drives buttons/cards)
- Revise `DESIGN.md` to record light shadcn-style **tool** chrome while home remains list-based Operate surface

## Per-tool layouts

| Tool | Layout |
|------|--------|
| JSON formatter, Base64, SHA-256, Text case | Title block; `lg:grid-cols-2` Input/Output cards; action bar (Clear / Copy / primary actions) |
| UUID | Controls card + Output card |
| Unix timestamp | Two cards (sec→ISO / ISO→sec), 2-col on large screens |
| PDF → Image | Wizard (below) |

Preserve existing accessible names used by e2e where practical (e.g. JSON **Format** button, `aria-label`s on textareas). Prefer keeping labels over rewriting Playwright specs; if a label must change, update the matching e2e in the same change.

## PDF wizard

Behavior from `docs/features/pdf-to-image.md` unchanged. UI steps:

1. **Upload** — file input (and optional drop affordance); show filename + page count on success; Next disabled until valid PDF; errors via `role="alert"`
2. **Range** — From / To / Format (PNG \| JPG); Back; Convert (disabled when busy / invalid); errors inline
3. **Download** — confirm download started (re-trigger download control if needed); “Convert another” resets to step 1

No thumbnail preview grid. Object URL revoke rules stay as implemented.

## Docs to update

- This spec (source of truth for the change)
- Prior origin-note spec → status superseded
- `DESIGN.md` — tool chrome direction + light-only; home list retained
- `docs/features/home.md` — origin note
- `docs/features/pdf-to-image.md` — wizard UI notes
- `docs/README.md` — link this spec if indexed

## Testing

- Extend `testing/e2e/home.spec.ts` for origin note visibility
- Keep `testing/e2e/json-formatter.spec.ts` working (button name / labels)
- Unit logic/range tests unchanged
- No new PDF e2e required for this pass

## Explicit non-goals

- Prototype sidebar / home card grid / dark theme / persisted theme
- Replacing tool algorithms or PDF conversion pipeline
- Shipping `ui-prototype/` as the production app
- Importing the full prototype dependency tree

## Acceptance

- Home: brand, tagline, pills, origin note, tool list
- All seven tools use light prototype-style chrome
- PDF wizard completes upload → range → convert → download with existing privacy behavior
- No theme toggle; no theme storage
- `npm test`, `npm run test:e2e`, and `npm run build` pass
