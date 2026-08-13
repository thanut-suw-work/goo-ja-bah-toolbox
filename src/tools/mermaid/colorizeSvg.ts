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

const GEOM = '.label-container, rect, polygon, circle'

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

  if (type === 'flowchart' || type === 'er') {
    for (const node of root.querySelectorAll('g.node')) {
      if (node.closest('.cluster') || node.classList.contains('cluster')) continue
      if (node.closest('.edgeLabel') || node.classList.contains('edgeLabel')) continue
      const id = flowchartKey(node)
      if (user.ids.has(id)) continue
      const triple = colorFor(id)
      paintGeoms(node.querySelectorAll(GEOM), triple)
      paintLabels(node, triple)
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
  } else if (type === 'class') {
    for (const group of root.querySelectorAll('g.classGroup')) {
      const id =
        group.getAttribute('data-id') ??
        group.querySelector('text')?.textContent?.trim() ??
        ''
      if (user.ids.has(id)) continue
      const triple = colorFor(id)
      paintGeoms(group.querySelectorAll('rect'), triple)
      paintLabels(group, triple)
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

function flowchartKey(node: Element): string {
  const dataId = node.getAttribute('data-id')
  if (dataId) return dataId
  const id = node.getAttribute('id') ?? ''
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
