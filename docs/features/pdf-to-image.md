# Feature: PDF → PNG/JPG

## Purpose

Convert selected PDF page range to PNG or JPG entirely in the browser via `pdf.js` + canvas.

## Behavior

1. User selects a PDF file (File API only; never uploaded)
2. Parse with `pdf.js` worker; show page count
3. User sets **from–to** page range and output format (PNG | JPG)
4. Render pages to canvas → blobs
5. Range length 1 → single file download; length > 1 → **zip** of images
6. On unmount: revoke object URLs; drop file references

## Errors

- Corrupt / unsupported / password-protected → clear inline error
- Single-page render failure → report that page; do not crash the app
- Invalid range (from > to, out of bounds) → clamp or reject with inline message

## Performance

- Lazy-load this tool chunk and `pdf.js` only on `/tools/pdf-to-image` (registry `id`: `pdf-to-image`)
- Prefer worker rendering; avoid blocking the main thread longer than necessary

## Privacy

See `docs/privacy.md`. No server conversion.

## Tests

- Unit: range validation, naming helpers — `testing/unit/tools/pdf-to-image/`
- E2E: smoke with a tiny fixture PDF — `testing/e2e/` (when scaffolded)
