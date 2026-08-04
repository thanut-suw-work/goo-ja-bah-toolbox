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

## Design specs

| Spec | Topic |
|------|--------|
| `superpowers/specs/2026-08-05-gjb-toolbox-design.md` | Approved GJB Toolbox design (architecture, tools, privacy, testing, docs) |
| `superpowers/specs/2026-08-05-tool-ui-prototype-light-design.md` | Light prototype-style tool UI + PDF wizard + home origin note |
| `superpowers/specs/2026-08-05-home-origin-note-design.md` | Superseded (origin note folded into tool-ui spec) |

## Implementation plans

| Plan | Topic |
|------|--------|
| `superpowers/plans/2026-08-05-gjb-toolbox.md` | MVP implementation plan (scaffold → tools → e2e → Impeccable) |
| `superpowers/plans/2026-08-05-tool-ui-prototype-light.md` | Tool UI restyle + PDF wizard + origin note |

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

## UI reference (repo root)

| File | Purpose |
|------|---------|
| `../PRODUCT.md` | Product positioning and UX principles (Impeccable) |
| `../DESIGN.md` | Visual design system tokens and patterns (Impeccable) |
