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
- `component` — `React.lazy(() => import(...))`

Home and nav read the registry. Router loads lazy component by `id`.

Heavy tools (PDF) must be separate async chunks so first paint stays small.

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
