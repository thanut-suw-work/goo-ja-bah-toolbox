# PlantUML Viewer — Design Spec

Date: 2026-08-11  
Status: approved (brainstorm)  
Registry id: `plantuml` · Route: `/tools/plantuml`  
Title: **PlantUML**

Sister spec: `2026-08-11-svg-to-image-design.md` (shares `svgToRaster`).

## Summary

New toolbox tool: open or paste a PlantUML source file, click **Visualize**, see SVG in the browser. All `@startuml`…`@enduml` blocks in that one buffer render as stacked full-width cards. Syntax and include errors show on the failing card with a **file** line number. Download SVG and PNG per diagram. Client-only via official `@plantuml/core` (TeaVM) + bundled Graphviz (`viz-global.js`). No PlantUML text leaves the machine.

## Goals

- View PlantUML in-tab: sequence, class, component, usecase, activity, state (engine may draw other types; those are best-effort, not promised)
- Input: file picker **or** paste/edit in a textarea; one buffer at a time
- Explicit **Visualize** (not live-as-you-type)
- Render every `@startuml`…`@enduml` block, stacked, file order
- Pointed errors with 1-based file line numbers (includes + syntax)
- Per-diagram **Download SVG** and **Download PNG**
- Shared `svgToRaster` helper with the SVG to image tool (`2026-08-11-svg-to-image-design.md`)
- Lazy-load the heavy engine only on this route (PDF pattern)

## Non-goals

- JPEG download on this tool (SVG to image tool owns JPEG + quality)
- PNG/JPEG → SVG (tracing; different product)
- Resolving `!include` / `!includeurl` / `!includesub` / `!import` / `!include_once` / `!include_many` from disk, extra attached files, or network
- Bundled PlantUML stdlib / C4 / sprite packs
- Live render, persistence, accounts, remote `plantuml.com` / Kroki
- Third-party pan/zoom library (`panzoom`, `react-zoom-pan-pinch`, …). Homemade CSS `translate`/`scale` inside a native `<dialog>` is in scope (see UI).
- Diagram dark-mode toggle (`{ dark: true }` unused in MVP; engine default / light SVG)
- Splitting on non-`@startuml` delimiters (`@startmindmap`, `@startgantt`, …). A file with **no** `@startuml` is one block (whole textarea) and may still render if the engine accepts it. Mixed files: text between `@startuml` blocks is discarded, including other `@start*` diagrams
- JPEG/quality/scale controls on this page (see SVG to image spec)

## Constraints

- Privacy: `docs/privacy.md` — no tool-processing requests; static assets only (engine JS/WASM from **our** build, not unpkg/jsDelivr at runtime)
- No `localStorage` / `sessionStorage` / IndexedDB; React memory only; refresh clears
- Stack: React + Vite + TypeScript; registry + feature doc + mirrored tests
- UI: Impeccable Operate; honor `PRODUCT.md` / `DESIGN.md`; reuse `ToolLayout`, `IoPanel`, `ActionBar` — **not** `IoGrid` (that layout is side-by-side)
- Pin `@plantuml/core` **≥ 1.2026.6** (MIT). Do not pin GPL-licensed older versions
- Heavy deps stay in this tool’s async chunk; home/other tools must not download them until the route loads
- Local browser-reachable servers: never start in Cursor sandbox netns (user-level Cursor rule)

## Approach (chosen)

**Official in-browser engine + stacked UI.**

- Engine: npm `@plantuml/core` (TeaVM `plantuml.js` + `viz-global.js`). Graphviz-in-WASM is required for class/component/usecase/state and legacy activity. Bundle both; inject `viz-global.js` as a **classic script** from a Vite-bundled URL (`?url` or equivalent), then dynamic-import `plantuml.js`. `renderToString(lines, onSuccess, onError)` wrapped as a Promise.
- UI: stacked full-width — source card + action bar, then one result card per block.
- Includes: detect in parse; **do not** call the engine for that block; show a line-specific “one file only” error.
- PNG: `svgToRaster(svg, { format: 'png', scale: 1 })` in `src/tools/shared/` (same helper as SVG to image).

Rejected:

- Remote PlantUML/Kroki — breaks privacy
- Sequence-only or no-viz subset — user chose broad types; viz is already required for those types
- Side-by-side IoGrid — wide class/component diagrams need full width
- PDF-style wizard — fights edit → visualize → fix loops
- Extra file picker / bundled stdlib — user chose light, one file
- First-block-only — lies when a file has multiple diagrams

## Architecture

```
Browser
  └─ /tools/plantuml (lazy)
       ├─ PlantumlTool.tsx
       ├─ parse.ts          # blocks + include scan + line numbers
       ├─ render.ts         # load engine once; sequential renderToString
       ├─ panZoom.ts        # clamp / pan / wheel-around-cursor (no npm lib)
       ├─ DiagramLightbox.tsx
       └─ shared/svgToRaster.ts   # SVG string → PNG blob
```

| Unit | Does | Depends on |
|------|------|------------|
| `parse.ts` | Split blocks; record `startLine`; find include directives | — |
| `render.ts` | Script-inject viz; import engine; Promise API; one render at a time | `@plantuml/core` |
| `panZoom.ts` | Clamp / pan / wheel-around-cursor math | — |
| `DiagramLightbox.tsx` | Native `<dialog>`; pointer pan; wheel zoom | panZoom |
| `svgToRaster.ts` | SVG → canvas blob; PlantUML uses PNG scale 1; JPEG/scale live in SVG to image | DOM canvas |
| `PlantumlTool.tsx` | Source UI, Visualize, cards, lightbox, downloads, URL revoke | parse, render, svgToRaster, lightbox |

Engine singleton for the page visit. Sequential `await` per block (do not parallelize TeaVM). Unmount: revoke any object URLs created for PNG (and SVG downloads if used).

### Vite / `viz-global.js`

`viz-global.js` must run as a classic script (Graphviz global) before `plantuml.js`. Implementation must:

1. Resolve a bundled URL (not a CDN)
2. Insert `<script src=…>` once; wait for `load`
3. Then `import()` the ES module
4. Reuse on later Visualize clicks

If the package export map blocks `?url`, copy or alias in Vite config — keep runtime origin = our static host.

## UI

Reuse `ToolLayout` (title **PlantUML**, short description: view `.puml` in the browser; nothing uploaded).

### Source card (`IoPanel` “Source”)

- File input `accept=".puml,.plantuml,.iuml,.wsd,.txt"`; show filename after pick
- Pick → read UTF-8 into textarea (**replace** contents); user may edit afterward
- Textarea: paste/edit, monospace, min-height ~300px, `aria-label` for PlantUML source
- **Clear**: empty text, drop filename, wipe results, revoke URLs
- Unreadable file → inline error on this card (`Could not read file`); do not crash

### Action bar

- **Visualize**: disabled when textarea is empty/whitespace-only **or** a run is in flight. Label **Visualizing…** while busy (includes first-time engine load)
- No format toggles, no dark-diagram control

### Result cards (below, full width, file order)

- Heading `Diagram 1`, `Diagram 2`, …
- Success: clipped SVG preview (`max-height`, overflow hidden). **View** (and clicking the preview) opens a native `<dialog>` lightbox. Inside: left-drag pan, wheel zoom toward cursor (clamp 0.25–4). No pan/zoom npm package. **Esc** / backdrop / **Close**. Transform resets on close and on a new Visualize. Downloads are the original SVG, not the zoomed view.
- Actions: **View**, **Download SVG**, **Download PNG** (PNG button disabled/busy while that card rasterizes)
- Filenames: `{stem}-{n}.svg` / `{stem}-{n}.png`. `stem` = basename without extension of the last successfully read file; paste-only or after **Clear** → `diagram`. Editing the textarea after a pick keeps that stem until Clear or a new file pick
- Failure: no SVG; `role="alert"` on **that** card; siblings unchanged
- PNG raster fail: keep SVG + SVG download; alert `Could not create PNG: …`

First Visualize in a session may stall on chunk/WASM load; button label is the only extra wait affordance.

## Parse rules (`parse.ts`)

- Split on `@startuml` / `@enduml` **case-sensitive** (PlantUML’s tokens). Optional trailing args on the same line (`@startuml id`) still start a block
- No `@startuml` in the buffer → one block = entire text (trim not required for engine; empty/whitespace already blocked by the button)
- Missing `@enduml` at EOF → still emit the open block; engine may error
- Text between blocks: discarded
- Each block: `startLine` = 1-based file line of its `@startuml` (or `1` for the no-marker case); `lines` = block text split for the engine
- No artificial file-size cap; browser memory is the limit

### Include scan

Before engine, scan **that block’s** lines. A hit means: skip engine for the block, return include error.

Match after trim, **case-insensitive**, line must start with `!import` or with `!include` (prefix covers `!includeurl`, `!includesub`, `!include_once`, `!include_many`).

Do **not** treat a line as an include if the trimmed line starts with `'` (single-line comment). Block comments (`/'` … `'/`) are not stripped: an include inside a block comment still counts as a hit (known limit; scanner stays a line matcher).

Error copy quotes the source line’s directive + path **as written** (so `<c4/…>` vs `common.puml` vs a URL stay distinct). Use the path-include sentence unless the path is angle-bracket stdlib (`<…>`), then use the stdlib sentence.

## Data flow

```
file pick ──UTF-8──┐
                   ├→ sourceText
paste/edit ────────┘
         │
         │ Visualize click (clears previous results first so stale SVG never mixes)
         ▼
parse(sourceText) → blocks[]
         │
         ▼
for block of blocks (sequential await):
  include hit → { ok: false, error, line }
  else engine.renderToString → { ok: true, svg } | { ok: false, error, line }
         │
         ▼
results[] → cards
         │
Download SVG → Blob(svg) + <a download>
Download PNG → svgToRaster(svg, { format: 'png', scale: 1 }) → Blob + <a download> → revoke URL
```

**Engine line mapping:** if the engine message names a line number relative to the block, add `startLine - 1` (no-marker block: `startLine` is 1, so engine line = file line). UI always shows **file** line numbers.

**svgToRaster:** full signature and offline-URL rules live in `2026-08-11-svg-to-image-design.md`. This tool only calls `{ format: 'png', scale: 1 }`. Helper must not import PlantUML. Engine SVG that somehow contains remote `href`s fails PNG with `Could not create PNG: …`; the SVG download still works.

## Error handling

All inline, `role="alert"`. Preserve source text. No error toasts (clipboard toast unused unless Copy is added; MVP downloads via `<a download>`).

| Case | Where | Message shape |
|------|--------|----------------|
| Empty Visualize | button disabled | — |
| File read fail | source card | `Could not read file` |
| Path include | that result card | `Line 4: !include common.puml — this tool renders one file. Paste included contents into this diagram or remove the include.` |
| Stdlib include `<>` | that result card | `Line 4: !include <c4/C4_Container> — stdlib not bundled. Inline what you need or remove the include.` |
| Syntax / engine | that result card | Engine text + file line when parseable; else raw engine message |
| Chunk/engine load fail | tool error boundary | existing shell reload |
| PNG raster fail | that result card | `Could not create PNG: …` (SVG remains) |
| One block fails | that card only | siblings unchanged |

Include present → **never** call the engine for that block (no partial/wrong SVG).

## Privacy

- No upload, no `plantuml.com`, no Kroki, no `!includeurl` fetch
- Engine files = static host assets after Vite build
- File API read into memory; drop file reference on Clear / unmount
- Revoke object URLs on unmount (PDF pattern)

## Files (implementation)

1. `docs/features/plantuml.md` — feature doc
2. `src/tools/plantuml/parse.ts`
3. `src/tools/plantuml/render.ts`
4. `src/tools/plantuml/PlantumlTool.tsx`
5. `src/tools/shared/svgToRaster.ts`
6. `src/tools/registry.ts` + `types.ts` — add `plantuml`
7. `testing/unit/tools/plantuml/` — parse tests
8. `testing/unit/tools/shared/` — svgToRaster tests
9. `docs/README.md` + `docs/features/tool-registry.md` — index
10. `docs/architecture.md` — note PlantUML as a second heavy lazy chunk beside PDF
11. `package.json` — `@plantuml/core` dependency

Optional: `testing/e2e/fixtures/tiny-sequence.puml` + e2e only if CI can load the engine in reasonable time; parse unit tests are the merge gate.

## Testing

Unit tests **do not** boot `@plantuml/core` (slow, WASM, SVG not stable enough for pixel asserts).

**`parse.ts`**

- One `@startuml` block; several blocks; `@startuml id`
- No `@startuml` → single block, `startLine === 1`
- Unclosed block at EOF still emitted
- Junk between blocks dropped
- Include kinds + line numbers; stdlib `<>` vs path; `!includeurl` / `!import` / `!include_once`
- Commented include (`'` prefix) is **not** a hit
- `startLine` offsets for a second block

**`svgToRaster.ts`**

- Must not import PlantUML
- Shared tests under `testing/unit/tools/shared/` (offline URL scan, `rasterSize`, canvas if jsdom allows) — see SVG to image spec. Do not duplicate that suite here.

**UI (only if cheap):** Visualize disabled when empty; include error copy appears without mocking the full engine.

**CI:** Vitest remains the Pages deploy gate. Confirm PlantUML engine is not in the home/main chunk (same lazy-split discipline as `pdfjs-dist`).

## Docs / product follow-through

Implementation updates (not this spec’s job beyond listing them):

- Feature doc + registry checklist
- `docs/architecture.md` heavy-chunk note
- `PRODUCT.md` capabilities list: add PlantUML viewer
- `docs/privacy.md` only if wording must mention bundled WASM (allowed: static assets). No policy change for processing

## Image converter

Specified in `2026-08-11-svg-to-image-design.md`. Implement `svgToRaster` once; both tools import it. PNG→SVG remains out of scope forever for that helper.
