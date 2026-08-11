# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + Vite + TypeScript. Confirmed constraint from the approved design spec
(`docs/superpowers/specs/2026-08-05-gjb-toolbox-design.md`), not a delegated
choice — recorded here rather than asked again.

## Users

Developers and other technically comfortable people who need a small,
trustworthy utility (format JSON, encode Base64, hash a string, generate a
UUID, convert a timestamp, flip text case, pull pages out of a PDF) *right
now*, without creating an account, installing a CLI, or wondering where their
pasted data went. Typical situation: mid-task in an editor/terminal, need a
quick one-off transform, want to paste, get an answer, and move on.

## Product Purpose

GJB Toolbox is a collection of small, fast, client-side browser utilities.
Everything runs in the visitor's own tab; nothing is uploaded, logged, or
persisted. Success is: open a tool, do the task, leave with the state gone —
by design, not by omission.

## Positioning

Most "online tool" sites in this category are ad-funded pages that quietly
route pasted text through a server (or a bundled tracker) to justify the
free hosting. GJB Toolbox's mechanism is the opposite and it is falsifiable
by inspection: no backend exists, so there is nothing to route data to, and
that claim is checkable in the network tab.

## Operating Context

- Used ad hoc, mid-workflow, usually alongside a code editor or terminal.
- Session is single-purpose and short: paste/select input → transform →
  copy/download output → close tab. No expectation of returning to prior
  state.
- Content handled is sometimes sensitive (auth tokens being decoded,
  internal JSON payloads, real file contents for the PDF tool) — the
  privacy mechanism is not a nice-to-have, it is why the tool gets trusted
  with that content at all.

## Capabilities and Constraints

MVP tools (from the approved design spec): JSON formatter, Base64
encode/decode, UUID v4 generator, SHA-256 hash, Unix timestamp ↔ ISO UTC
converter, text case converter, PDF → PNG/JPG page-range export (client-side
`pdf.js`, lazy-loaded chunk), SVG → PNG/JPEG (canvas, shared `svgToRaster`). PlantUML viewer (in-browser `@plantuml/core`, lazy chunk; SVG + PNG per diagram).

Constraints:

- Static, client-only deploy (GitHub Pages / Cloudflare / Netlify-class
  hosting). No API, no auth, no server component of any kind.
- No `localStorage`, `sessionStorage`, or IndexedDB for app or tool state.
  Refreshing the page clears everything; this is intentional, not a gap.
- Tool-local React state only; no global store.
- New tools are added via a registry entry + lazy import + feature doc +
  mirrored unit tests (see `docs/features/tool-registry.md`).
- Heavy dependencies (`pdf.js`, `jszip`, `@plantuml/core`) must stay in an async chunk isolated to the tool that needs them so first paint elsewhere stays small.

## Brand Commitments

- Name: **GJB Toolbox**. Fixed, used as the primary wordmark in the app
  shell and as the accessible name of the home link (covered by e2e tests).
- Voice: plain, direct, a little dry — states what a tool does and what it
  doesn't do (e.g. "Nothing leaves your machine") rather than marketing
  copy.
- No existing logo, color, or type system predates this work — the visual
  world is established fresh as part of this task (see `DESIGN.md`).

## Evidence on Hand

None. No testimonials, customer logos, usage metrics, or press exist for
this product, and none are fabricated anywhere in this project. The only
"proof" the product can offer is the mechanism itself (client-only
processing, inspectable in the browser's network tab) and the absence of
persistence, which the UI states plainly instead of dramatizing.

## Product Principles

1. **Privacy is the product, not a footnote.** Every tool must work with
   zero network calls for its actual processing; the UI should make that
   legible, not just true.
2. **Zero friction beats feature depth.** No accounts, no settings to
   configure before first use, no onboarding — paste and go.
3. **Ephemeral by design.** State disappearing on refresh is a guarantee to
   keep, not a limitation to work around with "helpful" persistence.
4. **Density and scannability over decoration.** This is a tool people use
   many times, briefly; the interface should get out of the way fast.
5. **Extensible by convention.** New tools slot into the same registry,
   layout, and test pattern so the surface stays consistent as it grows.

## Accessibility & Inclusion

No product-specific accessibility requirement was established beyond
standard hygiene already reflected in the codebase: every input has an
associated label or `aria-label`, errors are announced via `role="alert"`,
and interactive elements must remain keyboard-operable with a visible focus
state. Treat this as the floor, not a ceiling.
