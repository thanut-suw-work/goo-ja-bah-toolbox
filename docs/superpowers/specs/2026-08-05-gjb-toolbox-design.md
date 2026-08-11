# GJB Toolbox — Design Spec

Date: 2026-08-05  
Status: approved (brainstorm)  
Product name: **GJB Toolbox**

## Summary

Fast client-side-rendered (CSR) webapp of small browser utilities. No backend. No user-data collection. No persistence. All processing stays in the user’s tab. UI craft via Impeccable (Operate mode). Implementation is docs-driven under `docs/`.

## Goals

- Instant, local tools for everyday encode/format/ID/time/text/PDF tasks
- Privacy by design: nothing leaves the machine; refresh clears state
- Fast first paint; heavy deps (PDF) load only when needed
- Easy to add tools via registry + feature doc + mirrored tests

## Non-goals

- Accounts, sync, cloud storage, analytics, cookies for tracking
- `localStorage` / `sessionStorage` / IndexedDB (superseded for theme only — see `2026-08-12-theme-design.md`; tool state still ephemeral)
- Server-side PDF conversion or any API
- Visual regression / full a11y suite on day one

## Constraints

- Stack: **React + Vite + TypeScript**
- Deploy: static files only (GitHub Pages / Cloudflare / Netlify, etc.)
- Ephemeral: no client persistence beyond in-memory React state
- Docs-driven: agents read `docs/README.md` before implementing
- UI: Impeccable Operate mode; `PRODUCT.md` / `DESIGN.md` own visual world

## Architecture

```
Browser
  └─ React app (Vite)
       ├─ App shell (brand, nav, layout)
       ├─ Router (react-router)
       │    /              → home / tool grid
       │    /tools/:id     → tool page
       └─ Tool registry
            ├─ light tools (small chunks)
            └─ pdf-to-image (lazy + pdf.js worker)
```

### Approach (chosen)

**Tool registry + lazy routes.** Each tool is a registry entry (`id`, title, description, lazy component). Router resolves `/tools/:id`. PDF/`pdf.js` loads only on that route.

Rejected: single-page no-router (fat PDF in main chunk; no deep links); iframe/plugin isolation (overkill).

## Components

| Unit | Responsibility | Depends on |
|------|----------------|------------|
| `AppShell` | Brand “GJB Toolbox”, nav, outlet | router |
| `ToolGrid` | Home list/grid of tools from registry | registry |
| `ToolLayout` | Per-tool chrome: title, short help, work area | — |
| `src/tools/<id>/` | Tool UI + pure logic modules | ToolLayout |
| `registry.ts` | Metadata + lazy imports | tool modules |
| Error boundary | Lazy-load / render failures on tool pages | router |

## MVP tools

1. JSON formatter  
2. Base64 encode/decode  
3. UUID generator  
4. Hash (SHA-256)  
5. Unix timestamp  
6. Text case  
7. PDF → PNG/JPG (`id`: `pdf-to-image`) with **page range** (client `pdf.js` + canvas; zip if range > 1 page)

## Data flow

1. User opens home → picks tool → `/tools/:id`  
2. Lazy chunk mounts; user pastes text or selects file  
3. Transform in memory → show result and/or download  
4. Navigate away or refresh → state gone  

No global store required for MVP. Tool-local React state only.

## Error handling

- Invalid input → inline message in tool UI  
- PDF: corrupt / password / unsupported → clear error, no crash  
- Per-page render failure → error for that page; app survives  
- Lazy import failure → tool error boundary + reload affordance  
- Never send errors or telemetry off-device  

## Privacy

- No network calls for tool processing (static asset + worker scripts only)  
- No analytics, no cookies for tracking  
- No `localStorage` / `sessionStorage` / IndexedDB except `gjb-theme` — see `2026-08-12-theme-design.md`  
- PDF/files via File API only; revoke object URLs on unmount  

See `docs/privacy.md`.

## Docs-driven layout

```
docs/
  README.md                 # agent index
  architecture.md
  privacy.md
  features/
    tool-registry.md
    home.md
    json-formatter.md
    base64.md
    uuid.md
    hash-sha256.md
    unix-timestamp.md
    text-case.md
    pdf-to-image.md
  superpowers/specs/        # design specs
AGENTS.md
PRODUCT.md / DESIGN.md      # Impeccable
testing/
  unit/                     # mirrors src/
  e2e/                      # mirrors flows/routes
  README.md
```

## Testing

- **Vitest** — unit tests under `testing/unit/` mirroring `src/`  
- **Playwright** — e2e under `testing/e2e/`  
- New tool: feature doc + registry + mirrored unit tests (e2e when flow non-trivial)  
- Prefer pure logic modules testable without full page mount  

## UI / Impeccable

- Mode: **Operate** (task UI; scanability and consistency over marketing flash)  
- Visual world established via Impeccable init/new-work during implementation  
- Agents must not invent ad-hoc generic AI aesthetics when Impeccable context exists  

## Implementation notes (for later plan)

- Scaffold Vite React-TS app at repo root (replace placeholder README content as needed)  
- Add react-router, Vitest, Playwright, pdfjs-dist  
- Write feature docs before or with each tool  
- Keep `.superpowers/` gitignored (brainstorm companion)  
- Local browser-reachable servers: never start in Cursor sandbox netns (user-level Cursor rule)
