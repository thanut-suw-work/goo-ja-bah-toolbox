# Feature: tool registry

## Purpose

Single source of truth for available tools: metadata + lazy-loaded UI (`src/tools/registry.ts`).

## Groups

| id | label |
|----|--------|
| `text` | Text |
| `ids-time` | IDs & time |
| `files` | Files |
| `diagrams` | Diagrams |

Catalog lives in `toolGroups` (`src/tools/registry.ts`). Display order = array order.

## Registered tools

| id | title | groupId |
|----|-------|---------|
| `json-formatter` | JSON formatter | `text` |
| `base64` | Base64 | `text` |
| `utf-encoding` | UTF encoding | `text` |
| `text-case` | Text case | `text` |
| `uuid` | UUID | `ids-time` |
| `hash-sha256` | SHA-256 hash | `ids-time` |
| `unix-timestamp` | Unix timestamp | `ids-time` |
| `pdf-to-image` | PDF to image | `files` |
| `svg-to-image` | SVG to image | `files` |
| `plantuml` | PlantUML | `diagrams` |
| `mermaid` | Mermaid | `diagrams` |

## Behavior

- Export typed list: `id`, `title`, `description`, `groupId`, lazy `component`
- Export `toolGroups` + `toolsByGroup()` for home
- Home consumes `toolsByGroup()`; router still resolves `/tools/:id` via `getToolById`
- Every tool must have a catalog `groupId`; every group must have ≥1 tool (unit tests)
- PDF, PlantUML, Mermaid, and other heavy tools use separate dynamic imports (`React.lazy`)

## Add-tool checklist

1. Add `docs/features/<id>.md`
2. Implement `src/tools/<id>/` (UI + pure logic)
3. Register in `registry.ts` with `groupId` and add `ToolId` in `types.ts` (add a `ToolGroup` + `ToolGroupId` first if the tool needs a new group)
4. Add `testing/unit/tools/<id>/` tests
5. Update `docs/README.md` feature table if needed
6. Optional e2e if flow is multi-step (e.g. PDF)

## Non-goals

- Runtime plugin loading from the network
- User-authored tools persisted in the browser
