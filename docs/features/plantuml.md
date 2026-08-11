# Feature: PlantUML

**Registry id:** `plantuml` · Route: `/tools/plantuml`

## Purpose

View PlantUML source in the browser. Paste or open one file, click **Visualize**, see every `@startuml`…`@enduml` block as a stacked SVG card. Download SVG and PNG per diagram. Nothing is uploaded. No `plantuml.com` / Kroki.

## Behavior

- Source: file picker (`accept=".puml,.plantuml,.iuml,.wsd,.txt"`) **or** textarea paste/edit; one buffer. Pick replaces textarea (UTF-8). Filename shown after a successful pick.
- **Clear**: empty text, drop filename/stem, wipe results, revoke object URLs.
- Unreadable file → source-card `Could not read file`.
- **Visualize** (not live): disabled when source is empty/whitespace or a run is in flight. Label **Visualizing…** while busy (includes first engine load). Clears previous results first.
- Layout: stacked full-width `IoPanel` Source + `ActionBar` + one result card per block. **Not** `IoGrid`. No JPEG/quality/scale/dark controls.
- Success card: heading `Diagram N`, inline SVG (`overflow: auto`), **Download SVG** + **Download PNG**.
- Filenames: `{stem}-{n}.svg` / `{stem}-{n}.png`. `stem` = basename without extension of the last successfully read file; paste-only or after Clear → `diagram`. Editing after a pick keeps the stem until Clear or a new pick.
- Failure: that card only, `role="alert"`; siblings unchanged.
- PNG raster fail: keep SVG + SVG download; `Could not create PNG: …`. PNG button disabled while that card rasterizes.
- Includes (`!include*` prefix or `!import`, case-insensitive, skip `'` comments, block comments not stripped): skip engine for that block; path vs stdlib (`<…>`) copy from the design spec.
- `@startuml` / `@enduml` are case-sensitive. No `@startuml` → one block = whole textarea. Unclosed block at EOF is still emitted. Text between blocks is discarded. Other `@start*` delimiters are not split points.

## Engine

- npm `@plantuml/core` ≥ 1.2026.6 (MIT). Classic-script inject of bundled `viz-global.js`, then dynamic import of `plantuml.js`. `renderToString` wrapped as a Promise. Sequential queue (TeaVM overwrites in-flight work).
- Lazy chunk: only `/tools/plantuml` downloads the engine. No CDN at runtime.
- Shared PNG: `svgToRaster(svg, { format: 'png', scale: 1 })` from `src/tools/shared/svgToRaster.ts` (owned by the SVG to image tool). This tool must not reimplement rasterization.

## Privacy

See `docs/privacy.md`. File API → memory only. No include fetches. Engine files are static host assets after Vite build. Revoke object URLs on unmount (PDF pattern).

## Tests

- Unit gate: `testing/unit/tools/plantuml/parse.test.ts` (do **not** boot `@plantuml/core`).
- Mapper: `testing/unit/tools/plantuml/render.test.ts` (`mapEngineError` only).
- Cheap UI: `testing/unit/tools/plantuml/PlantumlTool.test.tsx` with `render` / `svgToRaster` mocked.
- Optional e2e fixture is not the merge gate.
