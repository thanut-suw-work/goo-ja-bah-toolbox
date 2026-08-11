# SVG to Image — Design Spec

Date: 2026-08-11  
Status: approved (brainstorm)  
Registry id: `svg-to-image` · Route: `/tools/svg-to-image`  
Title: **SVG to image**

Sister spec: `2026-08-11-plantuml-viewer-design.md` (shares `svgToRaster`).

## Summary

New toolbox tool: open or paste one SVG, click **Convert**, preview the raster, download PNG or JPEG. Scale 1×/2×/3×. JPEG quality control. Entirely in-browser via canvas. No reverse conversion (PNG/JPEG → SVG). No network: remote `href` / `url()` in the SVG is an error, not a fetch.

## Goals

- SVG → PNG and SVG → JPEG (one format per Convert)
- Input: file picker **or** paste/edit SVG markup; one buffer
- Explicit **Convert** (not live)
- Preview the **raster** on screen, then **Download**
- Scale 1× / 2× / 3× from parsed SVG size (default **2×**)
- JPEG quality 10–100% (default 92%); disabled when format is PNG
- Shared `src/tools/shared/svgToRaster.ts` with the PlantUML tool

## Non-goals

- PNG/JPEG → SVG (tracing)
- Bidirectional “image converter” marketing
- Batch files / zip
- Live convert-as-you-type
- Persistence, upload to a server, fetching external images/fonts
- Custom width×height fields (scale covers screenshot sharpness)
- SVG preview pane (raster preview is the quality check)
- JPEG on the PlantUML tool (that tool stays PNG-only at scale 1)

## Constraints

- Privacy: `docs/privacy.md` — no tool-processing network. Rasterize via `<img>` + canvas, never inline SVG into the DOM in a way that executes `<script>`
- No `localStorage` / `sessionStorage` / IndexedDB
- Stack: React + Vite + TypeScript; registry + feature doc + mirrored tests
- UI: Impeccable Operate; `ToolLayout` + `IoPanel` + `ActionBar`; **not** `IoGrid`
- No new heavy deps (no WASM, no PlantUML import in this tool or in `svgToRaster`)
- Local browser-reachable servers: never start in Cursor sandbox netns

## Approach (chosen)

**Stacked source → convert → raster preview.** Same layout family as PlantUML viewer. One shared raster helper.

Rejected:

- Side-by-side IoGrid — preview needs width
- PDF-style wizard — extra steps for a one-shot convert
- Download-only, no preview — JPEG quality would be guesswork
- File-picker-only — SVG is text; paste is the common path

## Architecture

```
Browser
  └─ /tools/svg-to-image (lazy, light)
       ├─ SvgToImageTool.tsx
       └─ shared/svgToRaster.ts
            ├─ assertOfflineSvg(svg)     # no remote/relative fetches
            ├─ rasterSize(svg, scale)    # width/height/viewBox × scale
            └─ svgToRaster(svg, opts)    # canvas toBlob
```

| Unit | Does | Depends on |
|------|------|------------|
| `assertOfflineSvg` | Allow only `data:` and in-document `#fragment` refs | DOMParser |
| `rasterSize` | Parse CSS pixels × scale | DOMParser |
| `svgToRaster` | Draw SVG blob to canvas → Blob | both + canvas |
| `SvgToImageTool.tsx` | Source, controls, preview, download, URL revoke | svgToRaster |

PlantUML calls `svgToRaster(svg, { format: 'png', scale: 1 })`. This tool passes format, scale, and JPEG quality.

### `svgToRaster` signature

```ts
type RasterFormat = 'png' | 'jpeg'
type RasterScale = 1 | 2 | 3

svgToRaster(
  svg: string,
  opts: { format: RasterFormat; scale: RasterScale; quality?: number },
): Promise<Blob>
```

- `quality`: 0.1–1.0, default **0.92**. Ignored for PNG
- Must not import PlantUML
- Draw path: SVG string → `Blob` (`image/svg+xml`) → object URL → `new Image()` → `drawImage` → `canvas.toBlob(type, quality)`
- **Do not** use `innerHTML` / inline `<svg>` for rasterizing (avoids running SVG `<script>`)

### Offline SVG rule

After `DOMParser` (`image/svg+xml`), walk:

- Attributes: `href`, `xlink:href`, `src` (any element)
- `<style>` text and `style=""` attributes: `url(...)` and `@import`

**Allowed:** empty; `#fragment` / `url(#id)`; `data:` URLs.

**Rejected:** `http:`, `https:`, protocol-relative `//`, `file:`, `blob:` (except our own draw URL, which is not in the source), relative paths (`logo.png`, `../x`), other schemes.

Do **not** scan arbitrary text nodes for the substring `https://` (labels must not false-positive).

If parser error or root is not `svg` → treat as not an SVG document.

## UI

### Source card (`IoPanel` “Source”)

- File input `accept=".svg,image/svg+xml,.txt"`; show filename after pick
- Pick → read UTF-8 into textarea (**replace**); edit afterward OK
- Textarea: monospace, min-height ~300px, `aria-label` for SVG source
- **Clear**: empty text, drop filename, wipe preview, revoke URLs
- Unreadable file → `Could not read file` on this card

### Action bar

- Format: PNG | JPEG (default **PNG**)
- Scale: 1× / 2× / 3× (default **2×**)
- JPEG quality: 10–100% control (slider and/or number). Default **92**. **Disabled** when format is PNG. Out-of-range input **clamped** to 10–100; do not throw
- **Convert**: disabled when textarea empty/whitespace or busy. Label **Converting…**

### Preview card (`IoPanel` “Preview”)

- Convert start: clear previous `<img>` / URL so stale raster never sits next to a new error
- Success: `<img alt="Raster preview">` of the blob URL; container `overflow: auto`
- **Download**: `{stem}.png` or `{stem}.jpg`. `stem` = last successfully read file basename without extension; paste-only or after Clear → `image`. Edit-after-pick keeps stem until Clear or new pick
- Failure: `role="alert"` on this card; no `<img>`

## Data flow

```
file pick ──UTF-8──┐
                   ├→ sourceText
paste/edit ────────┘
         │
         │ Convert (wipe preview first)
         ▼
svgToRaster(sourceText, { format, scale, quality: jpegPct / 100 })
  1. DOMParser → root svg or fail
  2. assertOfflineSvg
  3. rasterSize: width/height px (unitless or px); if missing or `%` → viewBox w×h
     non-finite or ≤0 → fail
  4. canvas = (w × scale) × (h × scale)
  5. Image + toBlob
         ▼
preview URL → <img>
Download → <a download> → revoke on replace / Clear / unmount
```

JPEG `quality` not passed into `toBlob` when format is PNG.

## Error handling

Inline `role="alert"`. Source kept. No error toasts. Downloads via `<a download>`.

| Case | Where | Copy |
|------|--------|------|
| Empty Convert | button disabled | — |
| File read fail | source | `Could not read file` |
| Root not SVG / parse fail | preview | `Not an SVG document` |
| Disallowed URL | preview | `Line N: remote URL not loaded. This tool stays offline. Use a data: URL or embed the image.` Omit `Line N:` if the line cannot be determined. Same copy for relative paths (still a fetch). |
| No size | preview | `SVG has no width/height or viewBox` |
| Decode fail | preview | `Could not render SVG` |
| `toBlob` / canvas fail | preview | `Could not create image: …` |
| UI crash | error boundary | existing reload |

## Privacy

- No upload, no fetch of SVG-linked assets
- Reject disallowed URLs **before** `Image` load
- File API → memory; drop file ref on Clear / unmount
- Revoke object URLs on unmount (PDF pattern)

## Files (implementation)

1. `docs/features/svg-to-image.md`
2. `src/tools/shared/svgToRaster.ts` (shared with PlantUML — implement **once**)
3. `src/tools/svg-to-image/SvgToImageTool.tsx`
4. `src/tools/registry.ts` + `types.ts` — add `svg-to-image`
5. `testing/unit/tools/shared/` — `assertOfflineSvg`, `rasterSize`, svgToRaster
6. `docs/README.md` + `docs/features/tool-registry.md`
7. `PRODUCT.md` — add SVG to PNG/JPEG

No new npm packages.

Optional e2e: `testing/e2e/fixtures/tiny.svg` → Convert → preview `<img>`. Unit tests of size + offline scan are the merge gate.

## Testing

**`assertOfflineSvg` / `rasterSize`** (pure enough for jsdom `DOMParser`)

- `data:` href OK; `#id` / `url(#clip)` OK
- `https://`, `http://`, `//cdn`, `file:`, `logo.png` → reject
- `https://` only in a text node → **not** a reject
- Size: numeric width/height; `px`; `%` + viewBox fallback; viewBox only; missing both → error; 0 / NaN → error
- Scale 1/2/3: `{ width: w * scale, height: h * scale }`

**`svgToRaster` canvas**

- If jsdom `toBlob` works: tiny inline SVG → PNG blob; JPEG blob type
- If not: size + offline tests are the gate; document the gap

**UI (if cheap):** Convert disabled when empty; quality control disabled for PNG.

**CI:** Vitest Pages gate. This chunk must stay free of `@plantuml/core`.

## Relation to PlantUML

| | PlantUML | SVG to image |
|--|----------|----------------|
| Engine | `@plantuml/core` | none |
| Raster | `svgToRaster`, PNG, scale **1** | same helper, PNG or JPEG, scale 1–3 default **2** |
| JPEG | no | yes |
| Preview | inline SVG | raster `<img>` |

Implement `svgToRaster` first; both UIs import it. Do not duplicate canvas code.
