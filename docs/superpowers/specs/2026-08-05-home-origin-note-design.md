# GJB Toolbox — home origin note (copy-only)

Date: 2026-08-05  
Status: **superseded** by `2026-08-05-tool-ui-prototype-light-design.md` (home origin note retained there; tool UI scope expanded)

## Goal

Keep the live app shell and workshop light theme. Add one personal origin sentence under the home trust pills. No prototype layout/theme adoption.

## Decisions (locked)

| Topic | Choice |
|-------|--------|
| Shell layout | **B** — sticky header + hero + full-width tool rows (current) |
| Theme | **1** — light only; no dark mode; no theme toggle |
| Approach | **1** — copy only (no responsive refactor) |
| Origin placement | **C** — under trust pills, quieter than tagline |
| Prototype sidebar / cards / ModeToggle | Out of scope |

## Copy

**Tagline (unchanged):**

> Small browser utilities that run entirely in this tab. Paste, get your answer, and go — nothing you enter is sent anywhere.

**Trust pills (unchanged):** No accounts · No uploads · No tracking

**Origin note (new), under pills:**

> I built this after getting stuck on apps that only accept tax invoices as images — I had a PDF.

## Implementation

1. `src/app/HomePage.tsx` — after the trust-pills `<ul>`, add:

   ```tsx
   <p className="home-hero__origin">
     I built this after getting stuck on apps that only accept tax
     invoices as images — I had a PDF.
   </p>
   ```

2. `src/styles/global.css` — style `.home-hero__origin`:
   - `font-size: var(--text-sm)`
   - `color: var(--text-tertiary)`
   - `max-width: 62ch`
   - margin so it sits between pills and the home divider (use existing space tokens)

3. `docs/features/home.md` — document that home shows an origin note under the trust pills.

## Testing

- Extend `testing/e2e/home.spec.ts` to assert the origin sentence is visible on `/`.
- No new unit tests (static markup/copy).

## Explicit non-goals

- Importing `ui-prototype` shell, card grid, Lucide icon cards, or shadcn theme toggle
- Persisting or remembering theme (`localStorage` / `sessionStorage`)
- Revising `DESIGN.md` visual world or `docs/privacy.md` for theme exceptions
- Responsive layout rewrite (existing breakpoints stay; no new breakpoint work unless the origin line itself needs a trivial wrap fix)

## Acceptance

- Home still shows brand, existing tagline, trust pills, tool list
- Origin note appears under pills, quieter than tagline
- E2E home spec passes with origin assertion
- No theme toggle; light workshop tokens unchanged
