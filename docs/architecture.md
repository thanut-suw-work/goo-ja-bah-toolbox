# Architecture

## Overview

Static CSR SPA built with React + Vite + TypeScript. No backend. Hosted as static files.

## App shell

- Brand: **GJB Toolbox** (primary identity in chrome)
- Navigation: home + links/list of tools from registry
- Main outlet for routed tool pages

## Routing

| Path | View |
|------|------|
| `/` | Home / tool grid |
| `/tools/:id` | Tool page for registry id |

Use `react-router`. Unknown `id` → not-found within shell.

## Tool registry

Central module (e.g. `src/tools/registry.ts`) exports entries:

- `id` — URL segment
- `title`, `description` — home + layout
- `groupId` — catalog group (`text` / `ids-time` / `files` / `diagrams`)
- `component` — `React.lazy(() => import(...))`

Also exports `toolGroups` (id + label, display order) and `toolsByGroup()`. Home renders grouped `<details>` from that helper. Router loads lazy component by `id`.

Heavy tools (PDF, PlantUML, Mermaid) must be separate async chunks so first paint stays small.

## Source layout (target)

```
src/
  app/           # shell, router, error boundary
  tools/
    registry.ts
    <id>/        # Tool UI + pure logic
  styles/        # tokens / global (Impeccable-aligned)
testing/
  unit/          # mirrors src/
  e2e/           # mirrors flows
```

## Privacy coupling

Architecture forbids persistence layers and telemetry SDKs. See `privacy.md`.

## Deploy

- Host: **GitHub Pages** (project site)
- URL: `https://thanut-suw-work.github.io/goo-ja-bah-toolbox/`
- CI: `.github/workflows/deploy-pages.yml` — Vitest → Vite build → Pages
- Build sets `VITE_BASE=/goo-ja-bah-toolbox/` so asset URLs include the project path
- App uses `BrowserRouter` with `basename` from `routerBasename(import.meta.env.BASE_URL)` (strips trailing `/` — Vite `BASE_URL` ends with `/`; React Router basename must not)
- SPA deep links: CI copies `dist/index.html` → `dist/404.html` so Pages serves the shell for unknown paths
- One-time repo setting: **Settings → Pages → Source = GitHub Actions**
- Local default base remains `/` unless `VITE_BASE` is set
- Paths in the Routing table are relative to the router basename (empty locally; `/goo-ja-bah-toolbox` on Pages)
- Local project-base check: `VITE_BASE=/goo-ja-bah-toolbox/ npm run build && npm run preview -- --base /goo-ja-bah-toolbox/`
