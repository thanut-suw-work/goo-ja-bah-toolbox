# Home Tool Groups — Design Spec

Date: 2026-08-12  
Status: approved (brainstorm)  
Surface: home `/` only

## Summary

Home’s flat tool list becomes a **native accordion**: one `<details>` per group, `<summary>` label = group name. All groups start **open**. Collapse is optional and session-only. Tool rows (title, description, `/tools/:id`, chevron) stay as they are. Shell and tool pages do not change.

## Goals

- Scan tools by job (Text / IDs & time / Files / Diagrams) without hiding them on first paint
- Group labels come from a registry catalog, not ad-hoc strings in the view
- Every tool belongs to exactly one known group
- Keyboard and screen-reader behavior stay native (`<details>` / `<summary>`)
- Refresh still clears open/closed state (ephemeral product)

## Non-goals

- Grouped nav or sidebar on tool pages
- Search, favorites, recents
- Persisting which sections are open (`localStorage` / `sessionStorage` / IndexedDB forbidden)
- An “Other” / ungrouped bucket
- Exclusive accordion (only one group open)
- Card-grid home, filled “tab” chrome, unicode-glyph disclosure icons
- Reordering tools alphabetically inside a group

## Constraints

- Privacy: `docs/privacy.md` — no persistence of UI chrome either
- Stack: React + Vite + TypeScript; registry remains the source of truth
- UI: Impeccable **Operate**; honor `PRODUCT.md` / `DESIGN.md` (workshop paper, brass accent, no purple, no card-grid home)
- Existing `.tool-row` link pattern stays; grouping wraps it, does not restyle the rows into cards
- Local browser-reachable servers: never start in Cursor sandbox netns

## Approach (chosen)

**Group catalog + `groupId` on each tool. Home renders controlled `<details open>`.**

- `toolGroups: ToolGroup[]` defines id, label, and display order
- Each `ToolDefinition` has `groupId: ToolGroupId`
- `toolsByGroup()` walks the catalog and buckets `tools` by `groupId` (tools keep registry order inside a group)
- Home: one `<details class="tool-group">` per catalog entry; `<summary>` text = `label`; inner `<ul class="tool-list">` of existing rows
- Open state is React `useState(true)` per group + `onToggle`. React does not honor `defaultOpen` on `<details>`, and a sticky `open={true}` with no handler prevents collapse.

Rejected:

- Group **string** only on each tool — label typos and catalog order depend on first appearance
- Nested `groups[].toolIds` — membership drifts from `tools[]`
- Exclusive tabs — user chose accordion, all-open default
- `open={true}` with no toggle handler — React keeps the section forced open; collapse dies

## Architecture

```
HomePage
  └─ toolsByGroup()
       ├─ toolGroups (catalog order)
       └─ tools filtered by groupId (registry order)
            └─ <details open={useState(true)}>
                 ├─ <summary>{label}</summary>
                 └─ <ul class="tool-list"> existing tool rows
```

Router, lazy chunks, and `/tools/:id` unchanged.

## Data model

```ts
type ToolGroupId = 'text' | 'ids-time' | 'files' | 'diagrams'

type ToolGroup = {
  id: ToolGroupId
  label: string
}

type ToolDefinition = {
  id: ToolId
  title: string
  description: string
  groupId: ToolGroupId
  component: LazyExoticComponent<ComponentType>
}
```

### Catalog (display order)

| id | label |
|----|--------|
| `text` | Text |
| `ids-time` | IDs & time |
| `files` | Files |
| `diagrams` | Diagrams |

### Membership

| groupId | tools (registry relative order) |
|---------|----------------------------------|
| `text` | `json-formatter`, `base64`, `utf-encoding`, `text-case` |
| `ids-time` | `uuid`, `hash-sha256`, `unix-timestamp` |
| `files` | `pdf-to-image`, `svg-to-image` |
| `diagrams` | `plantuml`, `mermaid` |

New tool: set `groupId` to an existing id, **or** add a `ToolGroupId` + catalog row first. No implicit group.

## Components

| Unit | Responsibility | Depends on |
|------|----------------|------------|
| `types.ts` | `ToolGroupId`, `ToolGroup`, `groupId` on `ToolDefinition` | — |
| `registry.ts` | `toolGroups`, `tools[].groupId`, `toolsByGroup()` | types |
| `HomePage` | Hero unchanged; accordion of groups | `toolsByGroup` |
| `.tool-group*` CSS | Hairline section header + SVG/CSS chevron | existing tokens |

## Data flow

1. Home mounts → `toolsByGroup()` returns four `{ group, tools }` slices
2. Each slice renders `<details>` with local `open` starting `true` so every tool is visible
3. Click `<summary>` → browser toggles **that** `<details>` only
4. Click a tool row → `/tools/:id` as today
5. Leave or refresh → all groups open again

## Errors / invariants

No new user-facing error UI. Authoring bugs fail CI:

- `groupId` is `ToolGroupId` (unknown id = type error)
- Every registered tool has a catalog `groupId`
- Every catalog group has ≥1 tool
- `toolsByGroup()` does not invent “Other”

## UI

- Hero, trust pills, origin note: unchanged
- Group header: paper-surface section label, hairline, display font — not a filled tab or card
- Disclosure mark: CSS/SVG chevron (DESIGN.md forbids unicode-glyph icons). Hide native `::-webkit-details-marker` / `list-style` on `summary`
- Focus: visible ring using `--focus-ring`, same family as `.tool-row__link:focus-visible`
- Motion: chevron rotate ~160ms (existing row-chevron budget). No accordion height choreography
- Tool rows: keep `.tool-row` / `.tool-row__link` / path / chevron

## Testing

- **Unit (registry):** unique ids; catalog length 4; every tool has valid `groupId`; no empty group; `toolsByGroup()` order = catalog, inner order = registry
- **Unit (HomePage):** four `<details>` start `open`; summary names; JSON formatter under Text; PlantUML under Diagrams; links still `/tools/:id`; clicking Text summary **closes** that group (guards against sticky `open={true}` with no `onToggle`)
- **e2e:** existing home spec still passes; assert the four group `<summary>` labels are visible (Chromium exposes `<details>` as `group`, not `summary` as `button`)

## Docs

Update `docs/features/home.md`, `docs/features/tool-registry.md` (checklist + `groupId`), `docs/architecture.md` (registry fields), `docs/README.md` (this spec + plan).

## Add-tool checklist (delta)

1. Existing steps in `tool-registry.md`
2. Set `groupId` on the new entry (add catalog group first if needed)
