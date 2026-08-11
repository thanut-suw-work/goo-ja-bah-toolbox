# Feature: tool registry

## Purpose

Single source of truth for available tools: metadata + lazy-loaded UI (`src/tools/registry.ts`).

## Registered tools

| id | title |
|----|-------|
| `json-formatter` | JSON formatter |
| `base64` | Base64 |
| `uuid` | UUID |
| `hash-sha256` | SHA-256 hash |
| `unix-timestamp` | Unix timestamp |
| `text-case` | Text case |
| `pdf-to-image` | PDF to image |
| `utf-encoding` | UTF encoding |
| `svg-to-image` | SVG to image |
| `plantuml` | PlantUML |

## Behavior

- Export typed list: `id`, `title`, `description`, lazy `component`
- Home and nav consume registry for listing
- Router resolves `/tools/:id` via registry; missing id → not-found
- PDF, PlantUML, and other heavy tools use separate dynamic imports (`React.lazy`)

## Add-tool checklist

1. Add `docs/features/<id>.md`
2. Implement `src/tools/<id>/` (UI + pure logic)
3. Register in `registry.ts` and add `ToolId` in `types.ts`
4. Add `testing/unit/tools/<id>/` tests
5. Update `docs/README.md` feature table if needed
6. Optional e2e if flow is multi-step (e.g. PDF)

## Non-goals

- Runtime plugin loading from the network
- User-authored tools persisted in the browser
