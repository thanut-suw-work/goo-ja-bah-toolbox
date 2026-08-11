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
- Success card: heading `Diagram N`, clipped preview (`max-h-[min(70vh,36rem)] overflow-hidden`), **View** + **Download SVG** + **Download PNG**. Preview click or **View** opens a native `<dialog>` lightbox (`aria-modal`). **Esc**, backdrop click, or **Close** dismisses. Inside the lightbox only: left-drag pans, wheel zooms toward the cursor (scale 0.25–4, no npm pan/zoom lib). Pan/zoom resets on close and on a new Visualize. Downloads stay the original SVG/PNG, not the zoomed view.
- Filenames: `{stem}-{n}.svg` / `{stem}-{n}.png`. `stem` = basename without extension of the last successfully read file; paste-only or after Clear → `diagram`. Editing after a pick keeps the stem until Clear or a new pick.
- Failure: that card only, `role="alert"`; siblings unchanged. TeaVM TypeError (`can't access property "bGH"` / Chromium `Cannot read properties of undefined`) is rewritten on that card; it must not take down the tool error boundary.
- Double Visualize clicks are ignored via a busy ref (React `busy` state alone is one render late; TeaVM overwrites in-flight work).
- PNG raster fail: keep SVG + SVG download; `Could not create PNG: …`. PNG button disabled while that card rasterizes.
- Includes (`!include*` prefix or `!import`, case-insensitive, skip `'` comments, block comments not stripped): skip engine for that block; path vs stdlib (`<…>`) copy from the design spec.
- `@startuml` / `@enduml` are case-sensitive. No `@startuml` → one block = whole textarea. Unclosed block at EOF is still emitted. Text between blocks is discarded. Other `@start*` delimiters are not split points.

## Engine

- npm `@plantuml/core` ≥ 1.2026.6 (MIT). Classic-script inject of bundled `viz-global.js`, then dynamic import of `plantuml.js`. Both files load via Vite `?url` (copied as-is). Do not import `plantuml.js` as a bundlable module — production minify rewrites TeaVM names and the engine crashes (`bGH` / empty error) on GitHub Pages. `renderToString(lines, onSuccess, onError, {})` wrapped as a Promise with a 30s timeout and window `error` / `unhandledrejection` capture (TeaVM may throw on a timer instead of `onError`). Sequential queue (TeaVM overwrites in-flight work). Plain `string[]` copy before the engine (no holes / proxies).
- Lazy chunk: only `/tools/plantuml` downloads the engine. No CDN at runtime.
- Shared PNG: `svgToRaster(svg, { format: 'png', scale: 1 })` from `src/tools/shared/svgToRaster.ts` (owned by the SVG to image tool). This tool must not reimplement rasterization.

## Privacy

See `docs/privacy.md`. File API → memory only. No include fetches. Engine files are static host assets after Vite build. Revoke object URLs on unmount (PDF pattern).

## Tests

- Unit gate: `testing/unit/tools/plantuml/parse.test.ts` (do **not** boot `@plantuml/core`).
- Mapper: `testing/unit/tools/plantuml/render.test.ts` (`mapEngineError` only).
- Cheap UI: `testing/unit/tools/plantuml/PlantumlTool.test.tsx` with `render` / `svgToRaster` mocked (View opens lightbox; downloads stay unzoomed).
- Pan/zoom math: `testing/unit/tools/plantuml/panZoom.test.ts` (no engine).
- Optional e2e fixture is not the merge gate.
