# Mermaid Viewer — Design Spec

Date: 2026-08-12  
Status: approved (brainstorm)  
Registry id: `mermaid` · Route: `/tools/mermaid`  
Title: **Mermaid**

Sister specs: `2026-08-11-plantuml-viewer-design.md` (UI clone + shared lightbox/panZoom), `2026-08-11-svg-to-image-design.md` (shared `svgToRaster`).

## Summary

New toolbox tool: open or paste Mermaid source (raw `.mmd` or Markdown with `mermaid` / `mmd` fences), click **Visualize**, see SVG in the browser. Each diagram in that one buffer renders as a stacked full-width card. Syntax errors show on the failing card with a **file** line number. Download SVG and PNG per diagram. Client-only via npm `mermaid` (lazy chunk). No diagram text leaves the machine. No Kroki, mermaid.ink, mermaid.live, or CDN script.

## Goals

- View Mermaid in-tab. Promised types: **best-effort** — whatever the bundled `mermaid` version draws (flowchart, sequence, class, state, ER, gantt, pie, mindmap, timeline, git, …). Failures stay on that card.
- Input: file picker **or** paste/edit in a textarea; one buffer at a time
- Explicit **Visualize** (not live-as-you-type)
- Split Markdown fences (`mermaid` / `mmd`); if none, whole buffer = one diagram
- Pointed errors with 1-based **file** line numbers
- Per-diagram **Download SVG** and **Download PNG**
- Honor diagram `%%{init}%%` / YAML `---` config **except** always force `securityLevel: 'strict'` and never register icon packs / never fetch remote icons or images
- Shared `svgToRaster` (PNG scale 1) and shared lightbox/panZoom with PlantUML
- Lazy-load `mermaid` only on this route (PDF / PlantUML pattern)

## Non-goals

- JPEG download on this tool (SVG to image owns JPEG + quality)
- Live render, persistence, accounts, remote render APIs
- Extra deps: `@mermaid-js/layout-elk`, KaTeX, Iconify / `registerIconPacks`
- Markdown preview (no rendered prose; fences are extractors only)
- PlantUML fences in the same Markdown file
- Indented (4-space) code blocks as diagrams
- Third-party pan/zoom library
- Dark-diagram **toggle** in the chrome (diagram init `theme` is still honored)
- Editing or sanitizing the output SVG beyond what `mermaid.render` returns
- Changing PlantUML behavior other than import paths for the shared lightbox

## Constraints

- Privacy: `docs/privacy.md` — no tool-processing requests; `mermaid` JS from **our** build, not unpkg/jsDelivr at runtime
- No `localStorage` / `sessionStorage` / IndexedDB; React memory only; refresh clears
- Stack: React + Vite + TypeScript; registry + feature doc + mirrored tests
- UI: Impeccable Operate; honor `PRODUCT.md` / `DESIGN.md`; reuse `ToolLayout`, `IoPanel`, `ActionBar` — **not** `IoGrid`
- Pin `mermaid` to current MIT npm latest at implement time (`^11` or whatever npm resolves; MIT)
- Heavy dep stays in this tool’s async chunk; home/other tools must not download `mermaid` until this route loads (dynamic `import('mermaid')` inside `render.ts`)
- Local browser-reachable servers: never start in Cursor sandbox netns

## Approach (chosen)

**Bundled `mermaid` npm + PlantUML-clone stacked UI.**

- Engine: dynamic `import('mermaid')` on first Visualize. `mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' })` then `mermaid.render(id, text)` → SVG string.
- UI: stacked full-width — source card + action bar, then one result card per block.
- Parse: CommonMark-ish fences with info-string first word `mermaid` or `mmd` (case-insensitive). Zero such fences → one block = entire textarea.
- Security: do **not** override mermaid’s default `secure` key list (it already blocks directive overrides of `securityLevel`). Re-assert `securityLevel: 'strict'` before each render. Never call `registerIconPacks`. Never set `loose` / `antiscript`.
- PNG: `svgToRaster(svg, { format: 'png', scale: 1 })`.

Rejected:

- Remote Kroki / mermaid.ink / mermaid.live — privacy
- Runtime CDN `mermaid.min.js` — extra origin + supply-chain
- Live-as-you-type — user chose Visualize click
- Named type subset only — user chose best-effort
- ELK / KaTeX / icon packs — extra deps + CDN temptation
- Side-by-side `IoGrid` — wide diagrams need full width

## Architecture

```
Browser
  └─ /tools/mermaid (lazy)
       ├─ MermaidTool.tsx
       ├─ parse.ts          # fences vs whole-buffer + startLine
       ├─ render.ts         # load mermaid once; sequential mermaid.render
       └─ shared/
            ├─ svgToRaster.ts      # already exists
            ├─ panZoom.ts          # lift from plantuml
            └─ DiagramLightbox.tsx # lift from plantuml
```

| Unit | Does | Depends on |
|------|------|------------|
| `parse.ts` | Split mermaid/mmd fences; else 1 block = whole text; `startLine` = first engine line | — |
| `render.ts` | Dynamic-import mermaid; initialize strict; unique render ids; queue; map errors to file lines | `mermaid` |
| `MermaidTool.tsx` | Source UI, Visualize, cards, lightbox, downloads, URL revoke | parse, render, svgToRaster, lightbox |
| shared `panZoom.ts` | Clamp / pan / wheel-around-cursor math | — |
| shared `DiagramLightbox.tsx` | Native `<dialog>`; pointer pan; wheel zoom | panZoom |
| `svgToRaster.ts` | SVG → canvas blob; this tool uses PNG scale 1 | DOM canvas |

Engine singleton for the page visit. Sequential `await` per block (unique DOM ids; do not parallelize). Unmount: revoke object URLs.

### Lift (PlantUML)

Move `src/tools/plantuml/panZoom.ts` and `DiagramLightbox.tsx` to `src/tools/shared/`. PlantUML and Mermaid both import from shared. CSS class `plantuml-lightbox` becomes `diagram-lightbox` (same rules, both tools). Title id `diagram-lightbox-title`. No PlantUML behavior change besides paths and those names.

Move `testing/unit/tools/plantuml/panZoom.test.ts` → `testing/unit/tools/shared/panZoom.test.ts`.

## UI

Reuse `ToolLayout` (title **Mermaid** from registry, description: view `.mmd` / Mermaid fences in the browser; nothing uploaded).

Clone PlantUML chrome. Do not invent a second visual language.

### Source card (`IoPanel` “Source”)

- File input `accept=".mmd,.mermaid,.md,.markdown,.txt"`; show filename after pick
- Pick → read UTF-8 into textarea (**replace** contents); user may edit afterward
- Textarea: paste/edit, monospace, min-height ~300px, `aria-label` `Mermaid source`
- **Clear**: empty text, drop filename/stem, wipe results, revoke URLs, reset file input
- Unreadable file → inline error on this card (`Could not read file`); do not crash
- Short tip under the picker: each fence is one diagram; no fence → whole file. Two labeled examples: **Raw .mmd** (`flowchart TD` / `A-->B`) and **Markdown fences** (same chart inside ` ```mermaid `).

### Action bar

- **Visualize**: disabled when textarea is empty/whitespace-only **or** a run is in flight. Label **Visualizing…** while busy (includes first-time engine load)
- Double-click ignored via a busy **ref** (React `busy` state is one render late)
- No format toggles, no dark-diagram control

### Result cards (below, full width, file order)

- Heading `Diagram 1`, `Diagram 2`, …
- Success: clipped SVG preview (`max-h-[min(70vh,36rem)] overflow-hidden`). **View** (and clicking the preview) opens the shared native `<dialog>` lightbox. Inside: left-drag pan, wheel zoom toward cursor (clamp 0.25–8). Gantt uses `useMaxWidth: false` so the SVG keeps pixel size (default `width="100%"` shrinks wide charts in the lightbox). **Esc** / backdrop / **Close**. Transform resets on close and on a new Visualize. Downloads are the original SVG/PNG, not the zoomed view.
- Actions: **View**, **Download SVG**, **Download PNG** (PNG button disabled/busy while that card rasterizes)
- Filenames: `{stem}-{n}.svg` / `{stem}-{n}.png`. `stem` = basename without extension of the last successfully read file; paste-only or after **Clear** → `diagram`. Editing the textarea after a pick keeps that stem until Clear or a new file pick
- Failure: no SVG; `role="alert"` on **that** card; siblings unchanged
- PNG raster fail: keep SVG + SVG download; alert `Could not create PNG: …`

First Visualize in a session may stall on chunk load; button label is the only extra wait affordance.

## Parse rules (`parse.ts`)

Return `{ startLine: number; text: string }[]`. `text` is what the engine receives (fence markers **not** included). `startLine` is the 1-based file line of the **first line of `text`** (so engine line 1 = file line `startLine`; mapper is `fileLine = engineLine + startLine - 1`, same as PlantUML).

### Fence scan

Treat a line as an opening fence when:

- 0–3 leading spaces (4+ spaces is indented code — **ignore**)
- then 3 or more backticks **or** 3 or more tildes
- optional info string after the fence

Info string: trim; first whitespace-delimited token; compare case-insensitive to `mermaid` or `mmd`. Extra tokens (`mermaid title=foo`) still count. Other languages (`js`, `plantuml`, `mermaidjs`) do **not**.

Closing fence: 0–3 spaces, same character as the opener, length ≥ opener length, no info string (CommonMark). A new opening fence of the same kind while unclosed is **not** auto-closed; wait for a closer or EOF.

Rules:

- ≥1 mermaid/mmd fence → those blocks only; text outside dropped (including other fences)
- 0 such fences → one block: entire source (preserve newlines; do not trim). `startLine === 1`
- Unclosed mermaid/mmd fence at EOF → still emit the inner text
- Empty inner text is still a block (engine will error)
- No Markdown render. No nested-fence parser beyond CommonMark closer rules
- No artificial file-size cap

## Render (`render.ts`)

```
load once: import('mermaid') → mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' })
before each render: mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'default', gantt: { useMaxWidth: false } })
  then mermaid.render(uniqueId, text) → { svg }
```

- Unique `id` per call (`mmd-<n>`). Never reuse an in-DOM id.
- Sequential queue even if mermaid serializes internally.
- 30s timeout per diagram → `Mermaid render timed out`
- Do **not** pass a custom `secure` array (would drop mermaid defaults). Default `secure` already prevents `%%{init}%%` from setting `securityLevel`.
- Never `registerIconPacks`. Never `securityLevel: 'loose' | 'antiscript' | 'sandbox'`.
- `startOnLoad: false` always.

### Error mapping

`mapEngineError(message, startLine)`:

- Stringify non-strings; never throw
- If the message matches `/line\s+(\d+)/i`, rewrite that number to `engineLine + startLine - 1` and prefix `Line {fileLine}: …`
- Else show the raw engine text (or `Mermaid engine error` if empty)

## Data flow

```
file pick ──UTF-8──┐
                   ├→ sourceText
paste/edit ────────┘
         │
         │ Visualize click (clears previous results first)
         ▼
parseMermaid(sourceText) → blocks[]
         │
         ▼
for block of blocks (sequential await):
  renderBlock(block.text, block.startLine)
    → { ok: true, svg } | { ok: false, error, line }
         │
         ▼
results[] → cards
         │
Download SVG → Blob(svg) + <a download>
Download PNG → svgToRaster(svg, { format: 'png', scale: 1 }) → Blob + <a download> → revoke URL
```

**svgToRaster:** signature and offline-URL rules live in `2026-08-11-svg-to-image-design.md`. This tool only calls `{ format: 'png', scale: 1 }`. Helper must not import Mermaid. Engine SVG that contains remote `href`s fails PNG with `Could not create PNG: …`; SVG download still works.

## Error handling

All inline, `role="alert"`. Preserve source text. No error toasts. Downloads via `<a download>`.

| Case | Where | Message shape |
|------|--------|----------------|
| Empty Visualize | button disabled | — |
| File read fail | source card | `Could not read file` |
| Syntax / engine | that result card | Engine text + file line when parseable; else raw |
| Timeout | that result card | `Mermaid render timed out` |
| Chunk/engine load fail | tool error boundary | existing shell reload (`fatal` throw) |
| PNG raster fail | that result card | `Could not create PNG: …` (SVG remains) |
| One block fails | that card only | siblings unchanged |

Init/`securityLevel: loose` in source: no extra error; clamp via initialize + mermaid `secure` keys. If the engine still fails, show that card’s engine error.

## Privacy

- No upload, no Kroki, no mermaid.ink, no mermaid.live, no CDN mermaid, no Iconify fetch
- Engine files = static host assets after Vite build
- File API read into memory; drop file reference on Clear / unmount
- Revoke object URLs on unmount (PDF / PlantUML pattern)

## Files (implementation)

1. `docs/features/mermaid.md` — feature doc
2. `src/tools/mermaid/parse.ts`
3. `src/tools/mermaid/render.ts`
4. `src/tools/mermaid/MermaidTool.tsx`
5. `src/tools/shared/panZoom.ts` (moved)
6. `src/tools/shared/DiagramLightbox.tsx` (moved)
7. `src/tools/plantuml/PlantumlTool.tsx` + `DiagramLightbox` deletion — import shared
8. `src/tools/registry.ts` + `types.ts` — add `mermaid`
9. `testing/unit/tools/mermaid/`
10. `testing/unit/tools/shared/panZoom.test.ts` (moved)
11. `docs/README.md` + `docs/features/tool-registry.md` + `docs/architecture.md` + `PRODUCT.md`
12. `package.json` — `mermaid` dependency
13. `src/styles/global.css` — rename lightbox class

Optional: e2e fixture is **not** the merge gate.

## Testing

Unit tests **do not** boot `mermaid` for parse tests. UI tests mock `renderBlock` and `svgToRaster`.

**`parse.ts`**

- No fence → single block, `startLine === 1`, full text
- Several ` ```mermaid ` fences in file order
- ` ```mmd ` counts; ` ```Mermaid ` case-insensitive
- Info-string extra tokens (`mermaid title=foo`) count
- Ignore ` ```js `, ` ```plantuml `, ` ```mermaidjs `
- Tilde fences `~~~mermaid`
- Unclosed fence at EOF still emitted
- Junk / prose between fences dropped
- 4-space indented opener is not a fence
- `startLine` = first inner line (not the fence line)
- CRLF line splits

**`render.ts`**

- `mapEngineError` line rewrite + no-line raw message + stringify
- Source scan: `import('mermaid')` dynamic; `securityLevel: 'strict'` present; no `registerIconPacks`; no `securityLevel: 'loose'`

**UI (cheap)**

- Visualize disabled when empty/whitespace
- View opens lightbox; Esc/Close; downloads stay unzoomed (`svgToRaster` called with original svg, png scale 1)
- PNG fail copy `Could not create PNG: …` with SVG download still enabled
- File accept list includes `.mmd` and `.md`

**Shared panZoom:** existing tests, new import path. PlantUML UI tests must still pass after the lift.

**CI:** Vitest remains the Pages deploy gate. Confirm `mermaid` is not in the home/main chunk (same lazy-split discipline as `pdfjs-dist` / `@plantuml/core`).

## Docs / product follow-through

- Feature doc + registry checklist
- `docs/architecture.md` heavy-chunk note: PDF, PlantUML, Mermaid
- `PRODUCT.md` capabilities: add Mermaid viewer
- `docs/privacy.md` unchanged (static host assets already allowed)

## Image converter

Specified in `2026-08-11-svg-to-image-design.md`. PNG→SVG remains out of scope for that helper.
