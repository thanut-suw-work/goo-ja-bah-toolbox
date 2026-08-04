# Feature: tool registry

## Purpose

Single source of truth for available tools: metadata + lazy-loaded UI.

## Behavior

- Export a typed list/map of tools: `id`, `title`, `description`, lazy `component`
- Home and nav consume registry for listing
- Router resolves `/tools/:id` via registry; missing id → not-found
- PDF and other heavy tools must use separate dynamic imports

## Add-tool checklist

1. Add `docs/features/<id>.md`
2. Implement `src/tools/<id>/` (UI + pure logic)
3. Register in `registry.ts`
4. Add `testing/unit/tools/<id>/` tests
5. Update `docs/README.md` feature table if needed
6. Optional e2e if flow is multi-step (e.g. PDF)

## Non-goals

- Runtime plugin loading from the network
- User-authored tools persisted in the browser
