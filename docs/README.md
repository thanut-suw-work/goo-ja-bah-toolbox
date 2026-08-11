# Docs index (for agents)

Read **`AGENTS.md`** at repo root first, then use this table to open only what you need.

## When → read

| When you are… | Read these |
|---------------|------------|
| Starting any implementation task | `AGENTS.md`, this file, design spec below |
| Changing app shell, routing, or how tools register | `architecture.md`, `features/tool-registry.md`, `features/home.md` |
| Touching privacy, storage, network, analytics | `privacy.md` |
| Implementing or changing a specific tool | matching file under `features/` + `architecture.md` (registry section) |
| Adding a **new** tool | `features/tool-registry.md` (checklist), create `features/<id>.md`, mirror tests per `../testing/README.md` |
| PDF → image work | `features/pdf-to-image.md`, `privacy.md` |
| Writing or fixing tests | `../testing/README.md` + mirrored path under `testing/` |
| UI / visual design | Impeccable Operate mode; honor repo-root `PRODUCT.md` and `DESIGN.md` |
| Revisiting product decisions | `superpowers/specs/2026-08-05-gjb-toolbox-design.md` |
| Deploying / changing Pages CI or Vite `base` | `architecture.md` (Deploy), `superpowers/specs/2026-08-05-github-pages-deploy-design.md` |

## Design specs

| Spec | Topic |
|------|--------|
| `superpowers/specs/2026-08-05-gjb-toolbox-design.md` | Approved GJB Toolbox design (architecture, tools, privacy, testing, docs) |
| `superpowers/specs/2026-08-05-tool-ui-prototype-light-design.md` | Light prototype-style tool UI + PDF wizard + home origin note |
| `superpowers/specs/2026-08-05-home-origin-note-design.md` | Superseded (origin note folded into tool-ui spec) |
| `superpowers/specs/2026-08-05-github-pages-deploy-design.md` | GitHub Pages via Actions (project path, Vitest gate, SPA 404) |
| `superpowers/specs/2026-08-08-utf-encoding-design.md` | UTF encoding tool design |
| `superpowers/specs/2026-08-11-utf-code-points-design.md` | UTF tool: Unicode code points (`0x…`) mode |
| `superpowers/specs/2026-08-11-plantuml-viewer-design.md` | PlantUML viewer (in-browser `@plantuml/core`) |
| `superpowers/specs/2026-08-11-svg-to-image-design.md` | SVG → PNG/JPEG (shared `svgToRaster`) |
| `superpowers/specs/2026-08-12-mermaid-viewer-design.md` | Mermaid viewer (in-browser `mermaid`) |
| `superpowers/specs/2026-08-12-tool-groups-design.md` | Home tool groups (accordion by catalog) |

## Implementation plans

| Plan | Topic |
|------|--------|
| `superpowers/plans/2026-08-05-gjb-toolbox.md` | MVP implementation plan (scaffold → tools → e2e → Impeccable) |
| `superpowers/plans/2026-08-05-tool-ui-prototype-light.md` | Tool UI restyle + PDF wizard + origin note |
| `superpowers/plans/2026-08-05-github-pages-deploy.md` | GitHub Pages via Actions (test gate, project base, SPA 404) |
| `superpowers/plans/2026-08-08-utf-encoding.md` | UTF encoding tool implementation plan |
| `superpowers/plans/2026-08-11-utf-code-points.md` | UTF tool: code points mode |
| `superpowers/plans/2026-08-11-svg-to-image.md` | SVG → PNG/JPEG + shared `svgToRaster` |
| `superpowers/plans/2026-08-11-plantuml-viewer.md` | PlantUML viewer (`@plantuml/core`, stacked SVG) |
| `superpowers/plans/2026-08-12-mermaid-viewer.md` | Mermaid viewer (`mermaid`, stacked SVG) |
| `superpowers/plans/2026-08-12-tool-groups.md` | Home tool groups (accordion) |

## Feature docs

| File | Feature |
|------|---------|
| `features/tool-registry.md` | Registry + lazy routes + add-tool checklist |
| `features/home.md` | Home / tool grid |
| `features/json-formatter.md` | JSON formatter |
| `features/base64.md` | Base64 encode/decode |
| `features/uuid.md` | UUID generator |
| `features/hash-sha256.md` | SHA-256 hash |
| `features/unix-timestamp.md` | Unix timestamp |
| `features/text-case.md` | Text case |
| `features/pdf-to-image.md` | PDF → PNG/JPG with page range |
| `features/utf-encoding.md` | UTF encoding bi-converter (bytes + code points) |
| `features/svg-to-image.md` | SVG → PNG/JPEG |
| `features/plantuml.md` | PlantUML viewer (in-browser `@plantuml/core`) |
| `features/mermaid.md` | Mermaid viewer (in-browser `mermaid`) |

## UI reference (repo root)

| File | Purpose |
|------|---------|
| `../PRODUCT.md` | Product positioning and UX principles (Impeccable) |
| `../DESIGN.md` | Visual design system tokens and patterns (Impeccable) |
