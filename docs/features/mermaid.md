# Feature: Mermaid

**Registry id:** `mermaid` · Route: `/tools/mermaid`

## Purpose

View Mermaid source in the browser. Paste or open one file, click **Visualize**, see every `mermaid` / `mmd` fenced block (or the whole buffer if none) as a stacked SVG card. Download SVG and PNG per diagram. Nothing is uploaded. No Kroki / mermaid.ink / mermaid.live / CDN.

## Behavior

- Source: file picker (`accept=".mmd,.mermaid,.md,.markdown,.txt"`) **or** textarea paste/edit; one buffer. Pick replaces textarea (UTF-8). Filename shown after a successful pick. Source card shows a short tip (each fence is one diagram; no fence → whole file) and two labeled examples: **Raw .mmd** (`flowchart TD` / `A-->B`) and **Markdown fences** (same chart inside ` ```mermaid `).
- **Clear**: empty text, drop filename/stem, wipe results, revoke object URLs.
- Unreadable file → source-card `Could not read file`.
- **Visualize** (not live): disabled when source is empty/whitespace or a run is in flight. Label **Visualizing…** while busy (includes first engine load). Clears previous results first.
- Layout: stacked full-width `IoPanel` Source + `ActionBar` + one result card per block. **Not** `IoGrid`. No JPEG/quality/scale/dark controls.
- Success card: heading `Diagram N`, clipped preview (`max-h-[min(70vh,36rem)] overflow-hidden`), **View** + **Download SVG** + **Download PNG**. Preview click or **View** opens a native `<dialog>` lightbox (`aria-modal`). **Esc**, backdrop click, or **Close** dismisses. Inside the lightbox only: left-drag pans, wheel zooms toward the cursor (scale 0.25–8, no npm pan/zoom lib). Gantt renders with `useMaxWidth: false` so wide charts keep pixel size. Pan/zoom resets on close and on a new Visualize. Downloads stay the original SVG/PNG, not the zoomed view.
- Filenames: `{stem}-{n}.svg` / `{stem}-{n}.png`. `stem` = basename without extension of the last successfully read file; paste-only or after Clear → `diagram`. Editing after a pick keeps the stem until Clear or a new pick.
- Failure: that card only, `role="alert"`; siblings unchanged.
- Double Visualize clicks are ignored via a busy ref.
- PNG raster fail: keep SVG + SVG download; `Could not create PNG: …`. PNG button disabled while that card rasterizes.
- Fences: info-string first word `mermaid` or `mmd` (case-insensitive; extra tokens OK). Other languages ignored. No fences → whole textarea = one diagram. Unclosed fence at EOF still emitted. Text outside mermaid/mmd fences is discarded. Fence markers are not passed to the engine. 4-space indented openers are not fences. Tilde fences (`~~~mermaid`) count.

## Engine

- npm `mermaid` ^11 (MIT). Dynamic `import('mermaid')` then `initialize({ startOnLoad: false, securityLevel: 'strict' })` and `render(id, text)`. Re-assert strict + `theme: 'default'` before each render so mermaid’s default `secure` keys block directive overrides of `securityLevel`. Never `registerIconPacks`. Never `loose` / `antiscript`. Sequential queue. 30s timeout per diagram.
- Diagram `%%{init}%%` / YAML `---` theme and layout still apply (non-secure keys).
- Lazy chunk: only `/tools/mermaid` downloads the engine. No CDN at runtime.
- Shared PNG: `svgToRaster(svg, { format: 'png', scale: 1 })` from `src/tools/shared/svgToRaster.ts`. This tool must not reimplement rasterization.
- Shared lightbox/panZoom: `src/tools/shared/DiagramLightbox.tsx` and `panZoom.ts` (also used by PlantUML).

## Privacy

See `docs/privacy.md`. File API → memory only. No remote icon/image fetch. Engine files are static host assets after Vite build. Revoke object URLs on unmount (PDF pattern).

## Tests

- Unit gate: `testing/unit/tools/mermaid/parse.test.ts` (do **not** boot `mermaid`).
- Mapper + source scan: `testing/unit/tools/mermaid/render.test.ts`.
- Cheap UI: `testing/unit/tools/mermaid/MermaidTool.test.tsx` with `renderBlock` / `svgToRaster` mocked.
- Optional e2e fixture is not the merge gate.
