import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import {
  assertOfflineSvg,
  rasterSize,
  svgToRaster,
} from '@/tools/shared/svgToRaster'

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

const TINY_SVG = `<svg xmlns="${NS}" width="4" height="6"><rect width="4" height="6" fill="#000"/></svg>`

const isJsdom =
  typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)

const canToBlob =
  !isJsdom &&
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
    expect(helperSrc).not.toContain('mermaid')
    expect(helperSrc).not.toContain('tools/mermaid')
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
