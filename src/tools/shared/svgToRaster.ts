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
