# Feature: SVG to image

**Registry id:** `svg-to-image` · Route: `/tools/svg-to-image`

## Purpose

Convert one SVG (file or pasted markup) to PNG or JPEG entirely in the browser. Preview the **raster**, then download. No reverse tracing. Nothing is uploaded.

## Behavior

- Source: file picker (`accept=".svg,image/svg+xml,.txt"`) **or** textarea; one buffer. Pick replaces textarea UTF-8; edits afterward keep the file stem until Clear or a new pick.
- Explicit **Convert** (not live). Disabled when source is empty/whitespace or a run is in flight. Label **Converting…** while busy.
- Format: PNG (default) or JPEG. Scale: 1× / 2× / 3× (default **2×**). JPEG quality 10–100% (default **92**), disabled when PNG; out-of-range input is clamped.
- Preview: raster `<img alt="Raster preview">` of a blob URL (not inline SVG). Convert clears the previous image/URL first.
- Download: `{stem}.png` or `{stem}.jpg`. Paste-only or after Clear → stem `image`.
- Clear: empty text, drop filename, wipe preview, revoke object URLs.
- Unmount: revoke object URLs; drop file references.

## Shared helper

`src/tools/shared/svgToRaster.ts` (owned by this tool; PlantUML imports PNG scale 1 later):

- `assertOfflineSvg(svg)` — throws if not SVG or if `href` / `src` / `xlink:href` / CSS `url()` / `@import` would fetch. Allowed: empty, `#fragment`, `data:`.
- `rasterSize(svg, scale)` — CSS pixels × scale from width/height (`px` or unitless) or `viewBox`.
- `svgToRaster(svg, { format, scale, quality? })` — `Image` + canvas `toBlob`. JPEG quality 0.1–1.0 default 0.92; omitted for PNG. Must not import PlantUML.

Errors throw `Error` with the copy in the design spec (`Not an SVG document`, remote-URL sentence, `SVG has no width/height or viewBox`, `Could not render SVG`, `Could not create image: …`).

## Errors

| Case | Where | Copy |
|------|--------|------|
| Empty Convert | button disabled | — |
| File read fail | source | `Could not read file` |
| Root not SVG / parse fail | preview | `Not an SVG document` |
| Disallowed URL | preview | `Line N: remote URL not loaded. This tool stays offline. Use a data: URL or embed the image.` (omit `Line N:` if unknown) |
| No size | preview | `SVG has no width/height or viewBox` |
| Decode fail | preview | `Could not render SVG` |
| canvas / toBlob | preview | `Could not create image: …` |
| UI crash | error boundary | existing reload |

## Privacy

See `docs/privacy.md`. Reject disallowed URLs **before** `Image` load. No `innerHTML` raster path. No `localStorage` / network for processing.

## Tests

- Merge gate: `testing/unit/tools/shared/svgToRaster.test.ts` (`assertOfflineSvg`, `rasterSize`). Canvas `svgToRaster` tests skip when jsdom has no `toBlob`.
- Stem: `testing/unit/tools/svg-to-image/stem.test.ts`
- UI (cheap): `testing/unit/tools/svg-to-image/SvgToImageTool.test.tsx`
- Optional e2e: `testing/e2e/svg-to-image.spec.ts` + `testing/e2e/fixtures/tiny.svg`
