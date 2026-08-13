import { parseUserFills, type ShapeFamily } from './userFills'
import {
  PALETTES,
  shuffle,
  takeColor,
  type ColorTriple,
} from './palette'

export type ColorizeTheme = keyof typeof PALETTES

export type ColorizeResult = {
  previewSvg: string
  colored: boolean
}

const GEOM = '.label-container, rect, polygon, circle, path'

export function colorizePreview(
  svg: string,
  source: string,
  theme: ColorizeTheme,
  rng: () => number = Math.random,
): ColorizeResult {
  try {
    return colorizeInner(svg, source, theme, rng)
  } catch {
    return { previewSvg: svg, colored: false }
  }
}

function colorizeInner(
  svg: string,
  source: string,
  theme: ColorizeTheme,
  rng: () => number,
): ColorizeResult {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  if (hasParserError(doc)) throw new Error('invalid svg')
  const root = doc.documentElement
  if (!root || root.localName !== 'svg') throw new Error('not svg')

  const type = detectType(root.getAttribute('aria-roledescription'))
  if (!type) return { previewSvg: svg, colored: false }

  const user = parseUserFills(source)
  if (user.skipFamilies.has(type)) return { previewSvg: svg, colored: false }

  const colors = shuffle(PALETTES[theme], rng)
  const cache = new Map<string, ColorTriple>()
  const cursor = { cursor: 0 }
  let prevFill: string | null = null
  let stamped = false

  const colorFor = (key: string): ColorTriple => {
    const hit = cache.get(key)
    if (hit) return hit
    const triple = takeColor(colors, cursor, prevFill)
    prevFill = triple.fill
    cache.set(key, triple)
    return triple
  }

  const paintGeoms = (geoms: Iterable<Element>, triple: ColorTriple) => {
    for (const el of geoms) {
      if (el.localName === 'path') {
        const fill = el.getAttribute('fill')
        if (!fill || fill === 'none') continue
      }
      el.setAttribute('fill', triple.fill)
      el.setAttribute('stroke', triple.stroke)
      const s = el as HTMLElement | SVGElement
      s.style.setProperty('fill', triple.fill, 'important')
      s.style.setProperty('stroke', triple.stroke, 'important')
      stamped = true
    }
  }

  const paintLabels = (scope: ParentNode, triple: ColorTriple) => {
    for (const el of scope.querySelectorAll('text, tspan, .nodeLabel')) {
      el.setAttribute('fill', triple.label)
      const s = el as HTMLElement | SVGElement
      s.style.setProperty('fill', triple.label, 'important')
      s.style.setProperty('color', triple.label, 'important')
    }
  }

  if (type === 'flowchart' || type === 'er' || type === 'class') {
    for (const node of root.querySelectorAll('g.node, g.classGroup')) {
      if (node.closest('.cluster') || node.classList.contains('cluster')) continue
      if (node.closest('.edgeLabel') || node.classList.contains('edgeLabel')) continue
      const id = flowchartKey(node)
      if (user.ids.has(id)) continue
      const triple = colorFor(id)
      if (type === 'er') {
        paintGeoms(erHeaderGeoms(node), triple)
        paintLabels(erHeaderLabelScope(node), triple)
      } else if (type === 'class') {
        paintClassHeader(doc, node, triple, paintGeoms)
        paintLabels(classHeaderLabelScope(node), triple)
      } else {
        paintGeoms(node.querySelectorAll(GEOM), triple)
        paintLabels(node, triple)
      }
    }
  } else if (type === 'sequence') {
    for (const actor of root.querySelectorAll('rect.actor')) {
      if (actor.classList.contains('actor-line')) continue
      const name = actor.getAttribute('name') ?? (actor.textContent ?? '').trim()
      if (user.ids.has(name)) continue
      paintGeoms([actor], colorFor(name))
    }
    for (const man of root.querySelectorAll('g.actor-man')) {
      const name = man.getAttribute('name') ?? (man.textContent ?? '').trim()
      if (user.ids.has(name)) continue
      const triple = colorFor(name)
      paintGeoms(man.querySelectorAll(GEOM), triple)
      paintLabels(man, triple)
    }
    for (const t of root.querySelectorAll('text.actor')) {
      const name = t.getAttribute('name') ?? (t.textContent ?? '').trim()
      const triple = cache.get(name)
      if (!triple) continue
      t.setAttribute('fill', triple.label)
      const s = t as HTMLElement | SVGElement
      s.style.setProperty('fill', triple.label, 'important')
      s.style.setProperty('color', triple.label, 'important')
    }
  } else if (type === 'gantt') {
    const consumed = new Set<Element>()
    const nextLabel = (task: Element): Element | null => {
      const parent = task.parentElement
      if (parent) {
        for (const t of parent.querySelectorAll('text')) {
          if (consumed.has(t)) continue
          consumed.add(t)
          return t
        }
      }
      for (const t of root.querySelectorAll('text')) {
        if (consumed.has(t)) continue
        consumed.add(t)
        return t
      }
      return null
    }
    for (const task of root.querySelectorAll('rect.task')) {
      const label = nextLabel(task)
      const name = (label?.textContent ?? '').trim()
      if (user.ganttStatusNames.has(name)) continue
      const triple = colorFor(name)
      paintGeoms([task], triple)
      if (label) {
        label.setAttribute('fill', triple.label)
        const s = label as HTMLElement | SVGElement
        s.style.setProperty('fill', triple.label, 'important')
        s.style.setProperty('color', triple.label, 'important')
      }
    }
  }

  if (!stamped) return { previewSvg: svg, colored: false }
  return {
    previewSvg: new XMLSerializer().serializeToString(doc),
    colored: true,
  }
}

function detectType(desc: string | null): ShapeFamily | null {
  if (!desc) return null
  const d = desc.trim().toLowerCase()
  if (d.startsWith('flowchart')) return 'flowchart'
  if (d.startsWith('sequence')) return 'sequence'
  if (d.startsWith('class')) return 'class'
  if (d.startsWith('er')) return 'er'
  if (d.startsWith('gantt')) return 'gantt'
  return null
}

const SVG_NS = 'http://www.w3.org/2000/svg'

function erHeaderGeoms(node: Element): Element[] {
  const outer = [...node.querySelectorAll('.outer-path path, .outer-path rect, .outer-path polygon, .outer-path circle')]
  if (outer.length) return outer
  return [...node.querySelectorAll(':scope > rect, :scope > polygon, :scope > circle')]
}

function erHeaderLabelScope(node: Element): ParentNode {
  const name = node.querySelector('.label.name')
  return name ?? node
}

function classHeaderLabelScope(node: Element): ParentNode {
  const title = node.querySelector('.label-group')
  return title ?? node
}

function paintClassHeader(
  doc: Document,
  node: Element,
  triple: ColorTriple,
  paintGeoms: (geoms: Iterable<Element>, triple: ColorTriple) => void,
): void {
  const box = outerPathBox(node)
  const dividerY = firstDividerY(node)
  if (box && dividerY != null && dividerY > box.minY) {
    const rect = doc.createElementNS(SVG_NS, 'rect')
    rect.setAttribute('class', 'gjb-header-fill')
    rect.setAttribute('x', String(box.minX))
    rect.setAttribute('y', String(box.minY))
    rect.setAttribute('width', String(box.maxX - box.minX))
    rect.setAttribute('height', String(dividerY - box.minY))
    const outer = node.querySelector('.outer-path')
    if (outer?.nextSibling) node.insertBefore(rect, outer.nextSibling)
    else if (outer) outer.after(rect)
    else node.insertBefore(rect, node.firstChild)
    paintGeoms([rect], triple)
    rect.setAttribute('stroke', 'none')
    ;(rect as SVGElement).style.setProperty('stroke', 'none', 'important')
    return
  }
  paintGeoms(node.querySelectorAll(GEOM), triple)
}

function outerPathBox(
  node: Element,
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const filled = [...node.querySelectorAll('.outer-path path')].find((p) => {
    const fill = p.getAttribute('fill')
    return Boolean(fill && fill !== 'none')
  })
  const pts = parsePathCoords(filled?.getAttribute('d') ?? '')
  if (pts.length < 2) return null
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of pts) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  return { minX, maxX, minY, maxY }
}

function firstDividerY(node: Element): number | null {
  const d = node.querySelector('.divider path')?.getAttribute('d')
  const pts = parsePathCoords(d ?? '')
  if (!pts.length) return null
  return Math.min(...pts.map((p) => p.y))
}

function parsePathCoords(d: string): { x: number; y: number }[] {
  const tokens = d.match(/[MmLlHhVvZz]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g)
  if (!tokens) return []
  const pts: { x: number; y: number }[] = []
  let i = 0
  let cmd = ''
  let x = 0
  let y = 0
  const num = (): number => Number(tokens[i++])
  while (i < tokens.length) {
    const t = tokens[i]!
    if (/^[MmLlHhVvZz]$/.test(t)) {
      cmd = t
      i++
      if (cmd === 'Z' || cmd === 'z') continue
    }
    if (cmd === 'M' || cmd === 'L') {
      x = num()
      y = num()
      pts.push({ x, y })
      if (cmd === 'M') cmd = 'L'
    } else if (cmd === 'm' || cmd === 'l') {
      x += num()
      y += num()
      pts.push({ x, y })
      if (cmd === 'm') cmd = 'l'
    } else if (cmd === 'H') {
      x = num()
      pts.push({ x, y })
    } else if (cmd === 'h') {
      x += num()
      pts.push({ x, y })
    } else if (cmd === 'V') {
      y = num()
      pts.push({ x, y })
    } else if (cmd === 'v') {
      y += num()
      pts.push({ x, y })
    } else {
      break
    }
  }
  return pts
}

function flowchartKey(node: Element): string {
  const dataId = node.getAttribute('data-id')
  if (dataId) return dataId
  const id = node.getAttribute('id') ?? ''
  const classId = id.match(/classId-(.+)-(\d+)$/)
  if (classId) return classId[1]!
  const entity = id.match(/entity-(.+)-(\d+)$/)
  if (entity) return entity[1]!
  const numbered = id.match(/^flowchart-(.+)-(\d+)$/)
  if (numbered) return numbered[1]!
  if (id.startsWith('flowchart-')) return id.slice('flowchart-'.length)
  return id
}

function hasParserError(doc: Document): boolean {
  if (doc.querySelector('parsererror')) return true
  if (doc.getElementsByTagName('parsererror').length > 0) return true
  return doc.getElementsByTagNameNS('*', 'parsererror').length > 0
}
