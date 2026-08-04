# Feature: PDF → PNG/JPG

**Registry id:** `pdf-to-image` · Route: `/tools/pdf-to-image`

## Purpose

Convert selected PDF page range to PNG or JPG entirely in the browser via `pdf.js` + canvas.

## Behavior

1. User selects a PDF file (File API only; never uploaded)
2. Parse with `pdf.js` worker; show page count; default range 1–pageCount
3. User sets **from–to** page range and output format (PNG | JPG)
4. Render pages to canvas at 2× scale → blobs
5. Range length 1 → single file download (`page.png` / `page.jpg`); length > 1 → **zip** (`pages.zip`) of numbered images
6. On unmount: revoke pending object URLs; drop file references

## Errors

- Corrupt / unsupported / password-protected → clear inline error (`Could not read PDF: …`)
- Single-page render failure → error names the page; app stays up
- Invalid range (non-integers, out of bounds, from > to) → reject with inline message (no silent clamp)

## Performance

- Lazy-load this tool chunk and `pdfjs-dist` only on `/tools/pdf-to-image`
- Worker rendering via `pdf.js`; scale 2 for readable output

## pdf.js worker (Vite)

Point `GlobalWorkerOptions.workerSrc` at the bundled worker module so Vite resolves it at build time:

```ts
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()
```

Implemented in `src/tools/pdf-to-image/convert.ts`. No separate Vite plugin required.

## UI

3-step wizard in `PdfToImageTool.tsx` (`step: 1 | 2 | 3` state). A step indicator (three pills, current step emphasized) sits above the active card; steps are not independently clickable.

1. **Upload** — dashed dropzone-style card with a file input (`accept="application/pdf"`); shows filename + page count once parsed; **Next** stays disabled until `pageCount !== null`; parse errors shown inline (`role="alert"`)
2. **Range** — From / To number inputs + Format select (PNG | JPG); **Back** returns to step 1; **Convert** runs the existing conversion pipeline and only advances to step 3 on success (disabled + "Converting…" while busy); validation/render errors shown inline (`role="alert"`)
3. **Download** — confirms the download started (single file vs `pages.zip`); **Convert another** resets `file`/`pageCount`/`from`/`to`/`error`/`step` and clears the file input

## Privacy

See `docs/privacy.md`. No server conversion.

## Tests

- Unit: range validation — `testing/unit/tools/pdf-to-image/range.test.ts`
- E2E fixture: `testing/e2e/fixtures/tiny.pdf` (PDF flow e2e optional; home + json-formatter covered in `testing/e2e/`)
