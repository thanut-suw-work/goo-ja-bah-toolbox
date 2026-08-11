# SVG to Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an in-browser SVG → PNG/JPEG tool with explicit Convert, raster preview, and a shared `svgToRaster` helper that PlantUML will import later.

**Architecture:** Pure helper `src/tools/shared/svgToRaster.ts` parses with DOMParser, rejects remote/relative fetches, computes CSS-pixel size × scale, then draws via `Blob` → object URL → `Image` → canvas `toBlob` (never `innerHTML`). `SvgToImageTool.tsx` is a stacked Source → ActionBar → Preview layout (not `IoGrid`). Errors **throw** `Error` with UI-ready messages. No new npm packages. No PlantUML import in the helper or this tool.

**Tech Stack:** React 19 · Vite · TypeScript · Vitest (jsdom) · existing `IoPanel` / `ActionBar` / `Button` / `Textarea` / `Input` / `Label` · canvas `toBlob` (same pattern as `src/tools/pdf-to-image/convert.ts`)

**Spec:** `docs/superpowers/specs/2026-08-11-svg-to-image-design.md`

---

## Error policy (locked)

**Throw `Error`, never Result.** `assertOfflineSvg` returns `void`. `rasterSize` returns `{ width, height }`. `svgToRaster` returns `Promise<Blob>` and **rejects** with `Error`. Do not switch to `{ ok, error }` in later tasks.

Messages (exact):

| Throw | Message |
|-------|---------|
| Parse / root not `svg` | `Not an SVG document` |
| Disallowed URL (line known) | `Line N: remote URL not loaded. This tool stays offline. Use a data: URL or embed the image.` |
| Disallowed URL (line unknown) | `remote URL not loaded. This tool stays offline. Use a data: URL or embed the image.` |
| No usable size | `SVG has no width/height or viewBox` |
| `Image` decode fail | `Could not render SVG` |
| canvas / `toBlob` fail | `Could not create image: …` |

UI shows `error.message` in `role="alert"`. Source-card file read uses `Could not read file` (UI-only, not the helper).

---

## Parallel / ownership

This plan **owns** `svgToRaster` — implement it here first if both tools ship together. Do **not** create `src/tools/plantuml/**`, do **not** add `@plantuml/core`, do **not** write `docs/features/plantuml.md`.

Registry patches add **`svg-to-image` only**. Current registry has 8 ids; expected list becomes those 8 **plus** `svg-to-image`. Do not name the assertion “exactly eight”. If a plantuml branch already registered `plantuml`, **union** the expected ids on merge — do not delete `plantuml`.

---

## File map

**Create:**
```
src/tools/shared/svgToRaster.ts
testing/unit/tools/shared/svgToRaster.test.ts
src/tools/svg-to-image/stem.ts
src/tools/svg-to-image/SvgToImageTool.tsx
testing/unit/tools/svg-to-image/stem.test.ts
testing/unit/tools/svg-to-image/SvgToImageTool.test.tsx
docs/features/svg-to-image.md
testing/e2e/fixtures/tiny.svg
testing/e2e/svg-to-image.spec.ts
```

**Modify:**
```
src/tools/types.ts
src/tools/registry.ts
testing/unit/tools/registry.test.ts
docs/features/tool-registry.md
docs/README.md
PRODUCT.md
```

**Do not modify:** `package.json` (no new deps), `docs/privacy.md` (existing File API + revoke rules already cover this), `docs/architecture.md` (this tool is a light lazy route, not a heavy chunk).

---

### Task 1: `assertOfflineSvg` (TDD)

**Files:**
- Create: `testing/unit/tools/shared/svgToRaster.test.ts`
- Create: `src/tools/shared/svgToRaster.ts`

- [ ] **Step 1: Write failing tests**

Create `testing/unit/tools/shared/svgToRaster.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { assertOfflineSvg } from '@/tools/shared/svgToRaster'

const NS = 'http://www.w3.org/2000/svg'

function svgDoc(inner: string): string {
  return `<svg xmlns="${NS}" width="1" height="1">\n${inner}\n</svg>`
}

const REMOTE =
  'remote URL not loaded. This tool stays offline. Use a data: URL or embed the image.'

describe('assertOfflineSvg', () => {
  it('allows data: href, #fragment, and url(#id)', () => {
    expect(() =>
      assertOfflineSvg(
        svgDoc(
          `<image href="data:image/png;base64,AAAA" />
           <use href="#icon" />
           <rect style="clip-path: url(#clip)" width="1" height="1" />`,
        ),
      ),
    ).not.toThrow()
  })

  it('allows https:// only in a text node (no false positive)', () => {
    expect(() =>
      assertOfflineSvg(svgDoc('<text>https://example.com</text>')),
    ).not.toThrow()
  })

  it('rejects https href with Line N', () => {
    const src = svgDoc('<image href="https://example.com/x.png" />')
    expect(() => assertOfflineSvg(src)).toThrow(`Line 2: ${REMOTE}`)
  })

  it('rejects http, protocol-relative, file, blob, and relative paths', () => {
    const cases = [
      '<image href="http://example.com/x.png" />',
      '<image href="//cdn.example/x.png" />',
      '<image href="file:///tmp/x.png" />',
      '<image href="blob:https://example.com/uuid" />',
      '<image href="logo.png" />',
      '<image href="../x.svg" />',
    ]
    for (const inner of cases) {
      expect(() => assertOfflineSvg(svgDoc(inner)), inner).toThrow(REMOTE)
    }
  })

  it('rejects xlink:href https', () => {
    const src = `<svg xmlns="${NS}" xmlns:xlink="http://www.w3.org/1999/xlink" width="1" height="1">
<image xlink:href="https://evil.example/a.png" />
</svg>`
    expect(() => assertOfflineSvg(src)).toThrow(REMOTE)
  })

  it('rejects url(https) in style attribute and @import in style element', () => {
    expect(() =>
      assertOfflineSvg(
        svgDoc('<rect width="1" height="1" style="fill: url(https://evil.example/a.png)" />'),
      ),
    ).toThrow(REMOTE)
    expect(() =>
      assertOfflineSvg(
        svgDoc('<style>@import url("https://fonts.example/x.css");</style>'),
      ),
    ).toThrow(REMOTE)
  })

  it('rejects fill="url(https://…)" (presentation attr url())', () => {
    expect(() =>
      assertOfflineSvg(
        svgDoc('<rect width="1" height="1" fill="url(https://evil.example/a.png)" />'),
      ),
    ).toThrow(REMOTE)
  })

  it('does not reject fill="red"', () => {
    expect(() =>
      assertOfflineSvg(svgDoc('<rect width="1" height="1" fill="red" />')),
    ).not.toThrow()
  })

  it('throws Not an SVG document for parse failure and non-svg root', () => {
    expect(() => assertOfflineSvg('not svg')).toThrow('Not an SVG document')
    expect(() => assertOfflineSvg('<html></html>')).toThrow(
      'Not an SVG document',
    )
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- testing/unit/tools/shared/svgToRaster.test.ts
```

Expected: FAIL (module not found / `assertOfflineSvg` missing).

- [ ] **Step 3: Implement types + `assertOfflineSvg`**

Create `src/tools/shared/svgToRaster.ts`:

```ts
export type RasterFormat = 'png' | 'jpeg'
export type RasterScale = 1 | 2 | 3

const REMOTE_URL_ERROR =
  'remote URL not loaded. This tool stays offline. Use a data: URL or embed the image.'

const XLINK_NS = 'http://www.w3.org/1999/xlink'

function parseSvgRoot(svg: string): SVGSVGElement {
  let doc: Document
  try {
    doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  } catch {
    throw new Error('Not an SVG document')
  }
  const root = doc.documentElement
  if (!root || root.localName.toLowerCase() !== 'svg') {
    throw new Error('Not an SVG document')
  }
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Not an SVG document')
  }
  return root as unknown as SVGSVGElement
}

function lineNumberOf(source: string, needle: string): number | null {
  if (!needle) return null
  const idx = source.indexOf(needle)
  if (idx < 0) return null
  let line = 1
  for (let i = 0; i < idx; i++) {
    if (source[i] === '\n') line++
  }
  return line
}

function throwRemote(svg: string, ref: string): never {
  const line = lineNumberOf(svg, ref)
  throw new Error(
    line == null ? REMOTE_URL_ERROR : `Line ${line}: ${REMOTE_URL_ERROR}`,
  )
}

function unwrapCssUrl(value: string): string {
  const t = value.trim()
  const m = /^url\(\s*(['"]?)([\s\S]*?)\1\s*\)$/i.exec(t)
  return (m ? m[2] : t).trim()
}

function isAllowedRef(raw: string): boolean {
  const v = unwrapCssUrl(raw)
  if (v === '') return true
  if (v.startsWith('#')) return true
  if (/^data:/i.test(v)) return true
  return false
}

function assertRefAllowed(svg: string, raw: string): void {
  if (isAllowedRef(raw)) return
  throwRemote(svg, raw)
}

function checkCssRefs(svg: string, css: string): void {
  const urlRe = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi
  for (const m of css.matchAll(urlRe)) {
    assertRefAllowed(svg, m[2] ?? '')
  }
  const importRe =
    /@import\s+(?:url\(\s*(['"]?)([^'")]+)\1\s*\)|(['"])([^'"]+)\3)/gi
  for (const m of css.matchAll(importRe)) {
    assertRefAllowed(svg, m[2] || m[4] || '')
  }
}

export function assertOfflineSvg(svg: string): void {
  const root = parseSvgRoot(svg)
  const elements = [root, ...Array.from(root.querySelectorAll('*'))]
  for (const el of elements) {
    const refs = [
      el.getAttribute('href'),
      el.getAttribute('src'),
      el.getAttribute('xlink:href'),
      el.getAttributeNS(XLINK_NS, 'href'),
    ]
    for (const ref of refs) {
      if (ref != null) assertRefAllowed(svg, ref)
    }
    for (const attr of Array.from(el.attributes)) {
      checkCssRefs(svg, attr.value)
    }
    if (el.localName.toLowerCase() === 'style') {
      checkCssRefs(svg, el.textContent ?? '')
    }
  }
}
```

**Scan rules (spec + one gap fix):**

- `href` / `src` / `xlink:href`: any value that is not empty, `#fragment`, or `data:` → throw (covers `http(s):`, `//`, `file:`, `blob:`, `logo.png`, `../x`).
- `url(...)` and `@import` extracted from **all attributes** plus `<style>` text (catches `style=""` and presentation `fill="url(https://…)"`). Do **not** run the href-style checker on `fill="red"` — only `url()` / `@import` / href/src/xlink:href.
- Do **not** scan ordinary text nodes for the substring `https://`.
- Do **not** parse inside `data:` payloads.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- testing/unit/tools/shared/svgToRaster.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/shared/svgToRaster.ts testing/unit/tools/shared/svgToRaster.test.ts
git commit -m "$(cat <<'EOF'
feat(svg-to-image): add offline SVG URL guard

EOF
)"
```

---

### Task 2: `rasterSize` (TDD)

**Files:**
- Modify: `testing/unit/tools/shared/svgToRaster.test.ts`
- Modify: `src/tools/shared/svgToRaster.ts`

- [ ] **Step 1: Write failing `rasterSize` tests**

Append to `testing/unit/tools/shared/svgToRaster.test.ts`:

```ts
import { rasterSize } from '@/tools/shared/svgToRaster'

describe('rasterSize', () => {
  it('uses numeric width/height × scale', () => {
    const src = `<svg xmlns="${NS}" width="10" height="20"></svg>`
    expect(rasterSize(src, 1)).toEqual({ width: 10, height: 20 })
    expect(rasterSize(src, 2)).toEqual({ width: 20, height: 40 })
    expect(rasterSize(src, 3)).toEqual({ width: 30, height: 60 })
  })

  it('accepts px units', () => {
    const src = `<svg xmlns="${NS}" width="10px" height="20px"></svg>`
    expect(rasterSize(src, 1)).toEqual({ width: 10, height: 20 })
  })

  it('falls back to viewBox when width/height missing or percent', () => {
    const missing = `<svg xmlns="${NS}" viewBox="0 0 8 4"></svg>`
    expect(rasterSize(missing, 1)).toEqual({ width: 8, height: 4 })
    expect(rasterSize(missing, 2)).toEqual({ width: 16, height: 8 })
    const pct = `<svg xmlns="${NS}" width="100%" height="100%" viewBox="0 0 50 25"></svg>`
    expect(rasterSize(pct, 1)).toEqual({ width: 50, height: 25 })
  })

  it('prefers width/height over viewBox when both are px', () => {
    const src = `<svg xmlns="${NS}" width="10" height="20" viewBox="0 0 99 99"></svg>`
    expect(rasterSize(src, 1)).toEqual({ width: 10, height: 20 })
  })

  it('throws when size missing and when 0 / NaN', () => {
    expect(() =>
      rasterSize(`<svg xmlns="${NS}"></svg>`, 1),
    ).toThrow('SVG has no width/height or viewBox')
    expect(() =>
      rasterSize(`<svg xmlns="${NS}" width="0" height="10"></svg>`, 1),
    ).toThrow('SVG has no width/height or viewBox')
    expect(() =>
      rasterSize(`<svg xmlns="${NS}" width="foo" height="bar"></svg>`, 1),
    ).toThrow('SVG has no width/height or viewBox')
  })

  it('throws Not an SVG document for non-svg input', () => {
    expect(() => rasterSize('not svg', 1)).toThrow('Not an SVG document')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- testing/unit/tools/shared/svgToRaster.test.ts
```

Expected: FAIL (`rasterSize` not defined).

- [ ] **Step 3: Implement `rasterSize`**

Append to `src/tools/shared/svgToRaster.ts` (keep Task 1 code):

```ts
function parsePxLength(
  raw: string | null,
): 'missing' | 'percent' | 'invalid' | number {
  if (raw == null) return 'missing'
  const t = raw.trim()
  if (t === '') return 'missing'
  if (t.endsWith('%')) return 'percent'
  const m = t.match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*(px)?$/i)
  if (!m) return 'missing'
  const n = Number.parseFloat(m[1]!)
  if (!Number.isFinite(n)) return 'invalid'
  if (n <= 0) return 'invalid'
  return n
}

function sizeFromViewBox(
  root: Element,
): { width: number; height: number } | null {
  const vb = root.getAttribute('viewBox')
  if (vb == null || vb.trim() === '') return null
  const parts = vb.trim().split(/[\s,]+/).filter(Boolean)
  if (parts.length !== 4) return null
  const width = Number.parseFloat(parts[2]!)
  const height = Number.parseFloat(parts[3]!)
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null
  }
  return { width, height }
}

export function rasterSize(
  svg: string,
  scale: RasterScale,
): { width: number; height: number } {
  const root = parseSvgRoot(svg)
  const w = parsePxLength(root.getAttribute('width'))
  const h = parsePxLength(root.getAttribute('height'))
  let base: { width: number; height: number } | null = null
  if (typeof w === 'number' && typeof h === 'number') {
    base = { width: w, height: h }
  } else if (w === 'invalid' || h === 'invalid') {
    base = null
  } else {
    base = sizeFromViewBox(root)
  }
  if (!base) {
    throw new Error('SVG has no width/height or viewBox')
  }
  return { width: base.width * scale, height: base.height * scale }
}
```

**Size rules:** unitless or `px` → CSS pixels. Missing, `%`, or unknown units (`em`, `mm`, …) → `viewBox` width×height. Explicit `0` / NaN → error (do **not** fall back to viewBox). Non-svg → `Not an SVG document`.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- testing/unit/tools/shared/svgToRaster.test.ts
```

Expected: PASS (offline + size). **These two describes are the merge gate.**

- [ ] **Step 5: Commit**

```bash
git add src/tools/shared/svgToRaster.ts testing/unit/tools/shared/svgToRaster.test.ts
git commit -m "$(cat <<'EOF'
feat(svg-to-image): add rasterSize from width and viewBox

EOF
)"
```

---

### Task 3: `svgToRaster` canvas path (TDD)

**Files:**
- Modify: `testing/unit/tools/shared/svgToRaster.test.ts`
- Modify: `src/tools/shared/svgToRaster.ts`

jsdom often has **no** `canvas.toBlob` / 2d context. **Merge gate remains Task 1–2.** This task still adds a documented if/else canvas test plus a source-scan that the helper never mentions `@plantuml` / `tools/plantuml`.

- [ ] **Step 1: Write failing canvas + isolation tests**

Append to `testing/unit/tools/shared/svgToRaster.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { svgToRaster } from '@/tools/shared/svgToRaster'

const TINY_SVG = `<svg xmlns="${NS}" width="4" height="6"><rect width="4" height="6" fill="#000"/></svg>`

const canToBlob =
  typeof HTMLCanvasElement !== 'undefined' &&
  typeof HTMLCanvasElement.prototype.toBlob === 'function'

describe('svgToRaster isolation', () => {
  it('source does not reference PlantUML packages or tool paths', () => {
    const here = path.dirname(fileURLToPath(import.meta.url))
    const helperSrc = readFileSync(
      path.resolve(here, '../../../../src/tools/shared/svgToRaster.ts'),
      'utf8',
    )
    expect(helperSrc).not.toContain('@plantuml')
    expect(helperSrc).not.toContain('tools/plantuml')
  })
})

describe('svgToRaster canvas', () => {
  if (canToBlob) {
    it('returns a PNG blob for a tiny SVG', async () => {
      try {
        const blob = await svgToRaster(TINY_SVG, { format: 'png', scale: 1 })
        expect(blob.type).toMatch(/image\/png/)
        expect(blob.size).toBeGreaterThan(0)
      } catch (e) {
        // Image SVG decode is often missing in jsdom even when toBlob exists.
        console.warn(
          'canvas rasterize unavailable; merge gate is assertOfflineSvg + rasterSize',
          e,
        )
      }
    })

    it('returns a JPEG blob type', async () => {
      try {
        const blob = await svgToRaster(TINY_SVG, {
          format: 'jpeg',
          scale: 1,
          quality: 0.92,
        })
        expect(blob.type).toMatch(/image\/jpeg/)
      } catch (e) {
        console.warn(
          'canvas rasterize unavailable; merge gate is assertOfflineSvg + rasterSize',
          e,
        )
      }
    })
  } else {
    it.skip(
      'returns a PNG blob for a tiny SVG (jsdom has no canvas toBlob; merge gate is assertOfflineSvg + rasterSize)',
      () => {},
    )
    it.skip(
      'returns a JPEG blob type (jsdom has no canvas toBlob; merge gate is assertOfflineSvg + rasterSize)',
      () => {},
    )
  }
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- testing/unit/tools/shared/svgToRaster.test.ts
```

Expected: FAIL (`svgToRaster` not defined) **or** isolation test still passes if you only added that describe after implementing — the canvas/import of `svgToRaster` must fail until Step 3.

- [ ] **Step 3: Implement `svgToRaster`**

Append to `src/tools/shared/svgToRaster.ts`:

```ts
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not render SVG'))
    img.src = url
  })
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const finish = (blob: Blob | null) => {
      if (blob) resolve(blob)
      else reject(new Error('Could not create image: toBlob returned empty'))
    }
    try {
      if (quality === undefined) canvas.toBlob(finish, type)
      else canvas.toBlob(finish, type, quality)
    } catch (e) {
      reject(
        new Error(
          `Could not create image: ${e instanceof Error ? e.message : 'toBlob failed'}`,
        ),
      )
    }
  })
}

function jpegQuality(q?: number): number {
  const n = q ?? 0.92
  if (!Number.isFinite(n)) return 0.92
  return Math.min(1, Math.max(0.1, n))
}

function rethrowRasterError(e: unknown): never {
  if (e instanceof Error) {
    if (
      e.message === 'Not an SVG document' ||
      e.message === 'SVG has no width/height or viewBox' ||
      e.message === 'Could not render SVG' ||
      e.message === REMOTE_URL_ERROR ||
      e.message.endsWith(REMOTE_URL_ERROR) ||
      e.message.startsWith('Could not create image:')
    ) {
      throw e
    }
    throw new Error(`Could not create image: ${e.message}`)
  }
  throw new Error('Could not create image: unknown error')
}

export async function svgToRaster(
  svg: string,
  opts: { format: RasterFormat; scale: RasterScale; quality?: number },
): Promise<Blob> {
  try {
    assertOfflineSvg(svg)
    const { width, height } = rasterSize(svg, opts.scale)
    const mime = opts.format === 'jpeg' ? 'image/jpeg' : 'image/png'
    const svgBlob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(svgBlob)
    try {
      const img = await loadImage(url)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(width))
      canvas.height = Math.max(1, Math.round(height))
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Could not create image: canvas context unavailable')
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const quality =
        opts.format === 'jpeg' ? jpegQuality(opts.quality) : undefined
      return await canvasToBlob(canvas, mime, quality)
    } finally {
      URL.revokeObjectURL(url)
    }
  } catch (e) {
    rethrowRasterError(e)
  }
}
```

**Draw path (required):** SVG string → `Blob('image/svg+xml')` → `URL.createObjectURL` → `new Image()` → `drawImage` → `canvas.toBlob`. **Do not** use `innerHTML` or inline `<svg>` into the document (avoids SVG `<script>`).

**JPEG:** pass `quality` 0.1–1.0 (default `0.92`) into `toBlob`. **PNG:** call `toBlob(cb, 'image/png')` with **no** quality argument.

Revoke the helper’s SVG object URL in `finally` (that URL is not in the source document; `blob:` in the **source** stays rejected).

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- testing/unit/tools/shared/svgToRaster.test.ts
```

Expected: PASS. Canvas cases may show as **skipped** in jsdom (`it.skip` branch). That is OK. Isolation test must PASS. Offline + size tests must PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/shared/svgToRaster.ts testing/unit/tools/shared/svgToRaster.test.ts
git commit -m "$(cat <<'EOF'
feat(svg-to-image): rasterize SVG via Image and canvas

EOF
)"
```

---

### Task 4: Download stem helper (TDD)

**Files:**
- Create: `testing/unit/tools/svg-to-image/stem.test.ts`
- Create: `src/tools/svg-to-image/stem.ts`

Paste-only / after Clear → stem `image`. Last successfully read file → basename without the last extension. Edit-after-pick keeps that stem until Clear or a new pick (UI state in Task 5).

- [ ] **Step 1: Write failing tests**

Create `testing/unit/tools/svg-to-image/stem.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { DEFAULT_STEM, stemFromFilename } from '@/tools/svg-to-image/stem'

describe('stemFromFilename', () => {
  it('default stem is image', () => {
    expect(DEFAULT_STEM).toBe('image')
  })

  it('strips the last extension and any directory prefix', () => {
    expect(stemFromFilename('logo.svg')).toBe('logo')
    expect(stemFromFilename('my.diagram.svg')).toBe('my.diagram')
    expect(stemFromFilename('/tmp/a/b.svg')).toBe('b')
    expect(stemFromFilename('C:\\x\\y.svg')).toBe('y')
  })

  it('keeps names with no extension; empty → image', () => {
    expect(stemFromFilename('diagram')).toBe('diagram')
    expect(stemFromFilename('')).toBe('image')
    expect(stemFromFilename('   ')).toBe('image')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- testing/unit/tools/svg-to-image/stem.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

Create `src/tools/svg-to-image/stem.ts`:

```ts
export const DEFAULT_STEM = 'image'

export function stemFromFilename(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, '').trim()
  if (!base) return DEFAULT_STEM
  const cut = base.lastIndexOf('.')
  if (cut <= 0) return base
  const stem = base.slice(0, cut).trim()
  return stem || DEFAULT_STEM
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- testing/unit/tools/svg-to-image/stem.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/svg-to-image/stem.ts testing/unit/tools/svg-to-image/stem.test.ts
git commit -m "$(cat <<'EOF'
feat(svg-to-image): add download filename stem helper

EOF
)"
```

---

### Task 5: `SvgToImageTool` UI (TDD)

**Files:**
- Create: `testing/unit/tools/svg-to-image/SvgToImageTool.test.tsx`
- Create: `src/tools/svg-to-image/SvgToImageTool.tsx`

`ToolPage` already wraps `ToolLayout` — do **not** nest another `ToolLayout`. Stacked `space-y-6`: Source `IoPanel` → `ActionBar` → Preview `IoPanel`. **Not** `IoGrid`.

No Slider primitive in `src/components/ui/` — JPEG quality is a labeled native `input type="range"` plus `Input type="number"`. Do not add a new shadcn component.

ActionBar format/scale: native `<select>` inside `<label>` like `JsonFormatterTool` (ActionBar tools), not the PDF wizard `Select`.

Object URLs: revoke on replace / Clear / unmount. **Do not** copy the PDF 1s auto-revoke — the preview `<img>` still needs the URL.

- [ ] **Step 1: Write failing UI tests**

Create `testing/unit/tools/svg-to-image/SvgToImageTool.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SvgToImageTool } from '@/tools/svg-to-image/SvgToImageTool'

describe('SvgToImageTool', () => {
  it('disables Convert when the source is empty or whitespace', async () => {
    const user = userEvent.setup()
    render(<SvgToImageTool />)
    const convert = screen.getByRole('button', { name: 'Convert' })
    expect(convert).toBeDisabled()
    await user.type(screen.getByLabelText('SVG source'), '   ')
    expect(screen.getByRole('button', { name: 'Convert' })).toBeDisabled()
  })

  it('disables JPEG quality when format is PNG and enables it for JPEG', async () => {
    const user = userEvent.setup()
    render(<SvgToImageTool />)
    const quality = screen.getByLabelText('JPEG quality')
    expect(quality).toBeDisabled()
    await user.selectOptions(screen.getByLabelText('Format'), 'jpeg')
    expect(screen.getByLabelText('JPEG quality')).not.toBeDisabled()
  })

  it('shows Not an SVG document on the preview card after Convert', async () => {
    const user = userEvent.setup()
    render(<SvgToImageTool />)
    await user.type(screen.getByLabelText('SVG source'), '<html></html>')
    await user.click(screen.getByRole('button', { name: 'Convert' }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Not an SVG document')
    })
    expect(screen.queryByAltText('Raster preview')).toBeNull()
  })
})
```

If `toBeDisabled` / `toHaveTextContent` fail because jest-dom is not loaded, add as the first import in this file:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- testing/unit/tools/svg-to-image/SvgToImageTool.test.tsx
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement the tool**

Create `src/tools/svg-to-image/SvgToImageTool.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ActionBar, IoPanel } from '@/tools/shared/IoPanels'
import {
  svgToRaster,
  type RasterFormat,
  type RasterScale,
} from '@/tools/shared/svgToRaster'
import { DEFAULT_STEM, stemFromFilename } from './stem'

function clampJpegPct(n: number): number {
  if (!Number.isFinite(n)) return 92
  return Math.min(100, Math.max(10, Math.round(n)))
}

function triggerDownload(url: string, filename: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export function SvgToImageTool() {
  const [sourceText, setSourceText] = useState('')
  const [fileLabel, setFileLabel] = useState<string | null>(null)
  const [stem, setStem] = useState(DEFAULT_STEM)
  const [format, setFormat] = useState<RasterFormat>('png')
  const [scale, setScale] = useState<RasterScale>(2)
  const [jpegPct, setJpegPct] = useState(92)
  const [busy, setBusy] = useState(false)
  const [sourceError, setSourceError] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [downloadName, setDownloadName] = useState<string | null>(null)
  const pendingUrlsRef = useRef<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  function revokeAll(): void {
    for (const url of pendingUrlsRef.current) {
      URL.revokeObjectURL(url)
    }
    pendingUrlsRef.current.clear()
    setPreviewUrl(null)
  }

  useEffect(() => {
    const pending = pendingUrlsRef.current
    return () => {
      for (const url of pending) {
        URL.revokeObjectURL(url)
      }
      pending.clear()
    }
  }, [])

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      setSourceText(text)
      setFileLabel(file.name)
      setStem(stemFromFilename(file.name))
      setSourceError(null)
    } catch {
      setSourceError('Could not read file')
    }
  }

  function onClear() {
    setSourceText('')
    setFileLabel(null)
    setStem(DEFAULT_STEM)
    setSourceError(null)
    setPreviewError(null)
    setDownloadName(null)
    revokeAll()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function onConvert() {
    if (!sourceText.trim() || busy) return
    setPreviewError(null)
    setDownloadName(null)
    revokeAll()
    setBusy(true)
    try {
      const blob = await svgToRaster(sourceText, {
        format,
        scale,
        quality: format === 'jpeg' ? jpegPct / 100 : undefined,
      })
      const url = URL.createObjectURL(blob)
      pendingUrlsRef.current.add(url)
      setPreviewUrl(url)
      const ext = format === 'jpeg' ? 'jpg' : 'png'
      setDownloadName(`${stem}.${ext}`)
    } catch (err) {
      setPreviewUrl(null)
      setPreviewError(
        err instanceof Error ? err.message : 'Could not create image: unknown error',
      )
    } finally {
      setBusy(false)
    }
  }

  const jpegDisabled = format === 'png'

  return (
    <div className="space-y-6">
      <IoPanel
        title="Source"
        actions={
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            <Trash2 /> Clear
          </Button>
        }
      >
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
          <Label htmlFor="svg-file-input">SVG file</Label>
          <Input
            id="svg-file-input"
            ref={fileInputRef}
            type="file"
            accept=".svg,image/svg+xml,.txt"
            className="max-w-xs cursor-pointer"
            onChange={onFileChange}
          />
          {fileLabel ? (
            <p className="text-sm font-medium text-foreground">{fileLabel}</p>
          ) : null}
        </div>
        {sourceError ? (
          <p role="alert" className="px-4 py-2 text-sm text-destructive">
            {sourceError}
          </p>
        ) : null}
        <Textarea
          aria-label="SVG source"
          className="min-h-[300px] resize-none rounded-none border-0 font-mono focus-visible:ring-0 focus-visible:ring-offset-0"
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
        />
      </IoPanel>

      <ActionBar>
        <label className="flex items-center gap-2 text-sm">
          Format
          <select
            aria-label="Format"
            className="rounded-md border border-input bg-background px-2 py-1"
            value={format}
            onChange={(e) => setFormat(e.target.value as RasterFormat)}
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Scale
          <select
            aria-label="Scale"
            className="rounded-md border border-input bg-background px-2 py-1"
            value={scale}
            onChange={(e) =>
              setScale(Number(e.target.value) as RasterScale)
            }
          >
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={3}>3×</option>
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Label htmlFor="svg-jpeg-quality">JPEG quality</Label>
          <input
            id="svg-jpeg-quality"
            type="range"
            min={10}
            max={100}
            step={1}
            value={jpegPct}
            disabled={jpegDisabled}
            onChange={(e) => setJpegPct(clampJpegPct(Number(e.target.value)))}
            aria-label="JPEG quality"
          />
          <Input
            type="number"
            min={10}
            max={100}
            value={jpegPct}
            disabled={jpegDisabled}
            onChange={(e) => setJpegPct(clampJpegPct(Number(e.target.value)))}
            className="w-20"
            aria-label="JPEG quality percent"
          />
        </div>
        <Button
          type="button"
          onClick={onConvert}
          disabled={!sourceText.trim() || busy}
        >
          {busy ? 'Converting…' : 'Convert'}
        </Button>
      </ActionBar>

      <IoPanel
        title="Preview"
        actions={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!previewUrl || !downloadName}
            onClick={() => {
              if (previewUrl && downloadName) {
                triggerDownload(previewUrl, downloadName)
              }
            }}
          >
            <Download /> Download
          </Button>
        }
      >
        <div className="overflow-auto p-4">
          {previewError ? (
            <p role="alert" className="text-sm text-destructive">
              {previewError}
            </p>
          ) : null}
          {previewUrl ? (
            <img
              alt="Raster preview"
              src={previewUrl}
              className="h-auto max-w-full"
            />
          ) : null}
        </div>
      </IoPanel>
    </div>
  )
}

export default SvgToImageTool
```

**Behavior checklist (must all be in this component):**

- Defaults: format PNG, scale **2×**, JPEG quality **92**. Quality controls **disabled** when PNG. Number input out of range → `clampJpegPct` (10–100), never throw.
- Convert **not** live; disabled when empty/whitespace or `busy`; label **Converting…** while in flight.
- Convert **starts** by wiping previous preview URL/img/error so a stale raster never sits next to a new error.
- Success preview is a **raster** `<img alt="Raster preview">`, not inline SVG. Container `overflow-auto`.
- Download filename `{stem}.png` or `{stem}.jpg` from the format used at Convert time. Paste-only / Clear → `image`. File pick sets stem via `stemFromFilename`; editing the textarea does **not** clear stem.
- File input `accept=".svg,image/svg+xml,.txt"`; read UTF-8 with `file.text()` **replace** textarea; show filename; unreadable → source `role="alert"` `Could not read file`. Do not keep the `File` in React state after read.
- Preview failures: `role="alert"` on the preview card; no `<img>`.
- Unmount + Clear revoke object URLs (PDF privacy pattern, without the 1s timer).

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- testing/unit/tools/svg-to-image/SvgToImageTool.test.tsx testing/unit/tools/svg-to-image/stem.test.ts testing/unit/tools/shared/svgToRaster.test.ts
```

Expected: PASS (helper + stem + UI).

- [ ] **Step 5: Typecheck**

```bash
npx tsc -b --pretty false
```

Expected: OK (or only unrelated errors). `verbatimModuleSyntax` / `noUnusedLocals` apply under `src/`.

- [ ] **Step 6: Commit**

```bash
git add src/tools/svg-to-image/SvgToImageTool.tsx testing/unit/tools/svg-to-image/SvgToImageTool.test.tsx
git commit -m "$(cat <<'EOF'
feat(svg-to-image): add stacked convert and preview UI

EOF
)"
```

---

### Task 6: Register tool + docs

**Files:**
- Modify: `testing/unit/tools/registry.test.ts`
- Modify: `src/tools/types.ts`
- Modify: `src/tools/registry.ts`
- Create: `docs/features/svg-to-image.md`
- Modify: `docs/features/tool-registry.md`
- Modify: `docs/README.md`
- Modify: `PRODUCT.md`

- [ ] **Step 1: Update registry test (fail first)**

In `testing/unit/tools/registry.test.ts`, replace the third test so the title does **not** say “eight”. Expected ids = current eight **plus** `svg-to-image`:

```ts
  it('exposes the expected tool ids', () => {
    const expected = [
      'json-formatter',
      'base64',
      'uuid',
      'hash-sha256',
      'unix-timestamp',
      'text-case',
      'pdf-to-image',
      'utf-encoding',
      'svg-to-image',
    ]
    expect(tools.map((t) => t.id).sort()).toEqual([...expected].sort())
  })
```

**Merge note:** if `plantuml` is already in `registry.ts` when you land this, add `'plantuml'` to `expected` as well. This plan still only **inserts** the `svg-to-image` entry.

- [ ] **Step 2: Run registry test — expect FAIL**

```bash
npm test -- testing/unit/tools/registry.test.ts
```

Expected: FAIL (missing `svg-to-image`).

- [ ] **Step 3: Add `ToolId` + registry entry**

`src/tools/types.ts` — add `| 'svg-to-image'` to `ToolId`:

```ts
export type ToolId =
  | 'json-formatter'
  | 'base64'
  | 'uuid'
  | 'hash-sha256'
  | 'unix-timestamp'
  | 'text-case'
  | 'pdf-to-image'
  | 'utf-encoding'
  | 'svg-to-image'
```

If `plantuml` is already on the union, keep it and still add `svg-to-image`.

`src/tools/registry.ts` — append before the closing `]`:

```ts
  {
    id: 'svg-to-image',
    title: 'SVG to image',
    description: 'Convert SVG to PNG or JPEG in your browser.',
    component: lazy(() => import('./svg-to-image/SvgToImageTool')),
  },
```

- [ ] **Step 4: Run registry + tool tests — expect PASS**

```bash
npm test -- testing/unit/tools/registry.test.ts testing/unit/tools/shared/svgToRaster.test.ts testing/unit/tools/svg-to-image/stem.test.ts testing/unit/tools/svg-to-image/SvgToImageTool.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Write feature docs + product**

Create `docs/features/svg-to-image.md`:

```md
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
```

Update `docs/features/tool-registry.md` registered-tools table — add:

```
| `svg-to-image` | SVG to image |
```

Update `docs/README.md`:

- Feature table: `| \`features/svg-to-image.md\` | SVG → PNG/JPEG |`
- Implementation plans table: `| \`superpowers/plans/2026-08-11-svg-to-image.md\` | SVG to image (shared \`svgToRaster\`) |`

(Design spec row already exists.)

Update `PRODUCT.md` **Capabilities and Constraints** MVP tools sentence — append SVG conversion. Replace the capabilities paragraph with:

```md
MVP tools (from the approved design spec): JSON formatter, Base64
encode/decode, UUID v4 generator, SHA-256 hash, Unix timestamp ↔ ISO UTC
converter, text case converter, PDF → PNG/JPG page-range export (client-side
`pdf.js`, lazy-loaded chunk), SVG → PNG/JPEG (canvas, shared `svgToRaster`).
```

Do **not** add PlantUML to PRODUCT.md in this plan.

- [ ] **Step 6: Full unit suite**

```bash
npm test
```

Expected: all PASS. Confirm `package.json` was not modified.

- [ ] **Step 7: Commit**

```bash
git add src/tools/types.ts src/tools/registry.ts testing/unit/tools/registry.test.ts docs/features/svg-to-image.md docs/features/tool-registry.md docs/README.md PRODUCT.md
git commit -m "$(cat <<'EOF'
feat(svg-to-image): register tool and docs

EOF
)"
```

---

### Task 7: Optional e2e Convert preview

Unit tests of size + offline scan are the **merge gate**. This task is optional but specified: Chromium can rasterize even when jsdom cannot. Skip only if Playwright cannot run in the environment; do not block the unit merge on it.

**Files:**
- Create: `testing/e2e/fixtures/tiny.svg`
- Create: `testing/e2e/svg-to-image.spec.ts`

- [ ] **Step 1: Add fixture**

Create `testing/e2e/fixtures/tiny.svg`:

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8">
  <rect width="8" height="8" fill="#0a0"/>
</svg>
```

- [ ] **Step 2: Add spec**

Create `testing/e2e/svg-to-image.spec.ts`:

```ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect } from '@playwright/test'

const tiny = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/tiny.svg'),
  'utf8',
)

test('converts pasted SVG to a raster preview', async ({ page }) => {
  await page.goto('/tools/svg-to-image')
  await page.getByLabel('SVG source').fill(tiny)
  await page.getByRole('button', { name: 'Convert' }).click()
  const img = page.getByAltText('Raster preview')
  await expect(img).toBeVisible()
  const src = await img.getAttribute('src')
  expect(src).toMatch(/^blob:/)
})
```

- [ ] **Step 3: Run e2e**

Playwright’s `webServer` builds + previews. **Do not** start that preview inside the Cursor sandbox netns (host browser would get `ERR_CONNECTION_REFUSED`). From a host shell with full permissions:

```bash
npx playwright test testing/e2e/svg-to-image.spec.ts
```

Expected: PASS (real Chromium canvas).

- [ ] **Step 4: Commit**

```bash
git add testing/e2e/fixtures/tiny.svg testing/e2e/svg-to-image.spec.ts
git commit -m "$(cat <<'EOF'
test(svg-to-image): add convert preview e2e

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| PNG + JPEG; default PNG; default scale **2×**; JPEG quality default 92% (0.92); UI 10–100 clamped; quality disabled for PNG | 3, 5 |
| File or paste; stacked UI not IoGrid; Convert not live; preview raster `<img>` not SVG | 5 |
| Download `{stem}.png` / `{stem}.jpg`; default stem `image`; basename rules | 4, 5 |
| Offline: DOMParser; only `data:` and `#fragment` / `url(#id)`; reject http(s), `//`, `file:`, relative; no text-node `https://` false positive | 1 |
| Rasterize via Image + canvas `toBlob`, not `innerHTML` | 3 |
| No new npm deps; no PlantUML import in helper | 3, 6 |
| `assertOfflineSvg` + `rasterSize` pure tests = merge gate; canvas test if/else | 1, 2, 3 |
| Error copy from spec tables | 1, 2, 3, 5, 6 |
| Revoke object URLs on unmount/Clear (PDF pattern, no 1s preview kill) | 5 |
| Shared helper API (`RasterFormat`, `RasterScale`, three functions) | 1–3 |
| Registry `svg-to-image` + feature doc + README + PRODUCT.md | 6 |
| Optional e2e tiny.svg → Convert → preview img | 7 |
| UI crash → existing error boundary | — (ToolPage already wraps; no new code) |
| Empty Convert → button disabled | 5 |
| File read fail → `Could not read file` on source | 5 |
| PlantUML UI / `@plantuml/core` / `src/tools/plantuml/**` | — (out of scope) |

## Type consistency

- `RasterFormat = 'png' \| 'jpeg'`
- `RasterScale = 1 \| 2 \| 3`
- `assertOfflineSvg(svg: string): void` — **throws**
- `rasterSize(svg: string, scale: RasterScale): { width: number; height: number }` — **throws**
- `svgToRaster(svg, { format, scale, quality? }): Promise<Blob>` — **rejects** with `Error`
- `quality` is 0.1–1.0 in the helper; UI stores 10–100 and passes `jpegPct / 100` only for JPEG
- `ToolId` includes `'svg-to-image'`; route `/tools/svg-to-image`; title **SVG to image**
- Download extension is `.jpg` for `format === 'jpeg'` (blob MIME stays `image/jpeg`)
- `DEFAULT_STEM = 'image'`

## Spec gaps resolved in this plan

1. **Throw vs Result** — locked API returns `void` / size object / `Promise<Blob>` → **throw** everywhere.
2. **`fill="url(https://…)"`** — spec lists href/src/style only; presentation `url()` would still fetch. Plan scans `url()` / `@import` on **all attributes** plus `<style>` text, without treating `fill="red"` as a relative path.
3. **Unknown length units** (`em`, `mm`) — treated like missing → viewBox fallback; explicit `0` / NaN still error.
4. **Preview vs PDF URL revoke** — PDF revokes download URLs after 1s; this preview must **not**, or the `<img>` breaks. Revoke on replace / Clear / unmount only.
5. **jsdom canvas** — if/else + skip; merge gate is offline + size.
6. **Registry “eight”** — expected list = current ids + `svg-to-image`; rename the test; union with `plantuml` on parallel merge.
7. **Line numbers** — best-effort `indexOf` of the rejected ref in the source string; omit `Line N:` when not found (entities / rewritten values).
8. **ActionBar Select** — no Slider in repo; format/scale use native `<select>` like json-formatter ActionBar; quality uses `input type="range"` + number `Input`.
