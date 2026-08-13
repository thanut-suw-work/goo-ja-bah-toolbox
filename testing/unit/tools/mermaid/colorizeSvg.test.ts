import { describe, it, expect } from 'vitest'
import { colorizePreview } from '@/tools/mermaid/colorizeSvg'
import { PALETTES } from '@/tools/mermaid/palette'

const rng0 = () => 0

function fills(svg: string, selector: string): string[] {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  return [...doc.querySelectorAll(selector)].map(
    (el) => (el as Element).getAttribute('fill') ?? '',
  )
}

const FLOW = `<svg xmlns="http://www.w3.org/2000/svg" aria-roledescription="flowchart-v2">
  <g class="node" data-id="A"><rect class="label-container" fill="#1f2020" stroke="#ccc"/><text fill="#ccc">Start</text></g>
  <g class="node" data-id="B"><polygon class="label-container" fill="#1f2020" stroke="#ccc"/></g>
  <g class="cluster"><rect fill="#111"/></g>
</svg>`

const SEQ = `<svg xmlns="http://www.w3.org/2000/svg" aria-roledescription="sequence">
  <rect class="actor actor-top" name="User" fill="#1f2020" stroke="#ccc"/>
  <rect class="actor actor-bottom" name="User" fill="#1f2020" stroke="#ccc"/>
  <rect class="actor actor-top" name="App" fill="#1f2020" stroke="#ccc"/>
  <line class="actor-line" stroke="#999"/>
</svg>`

const CLASS = `<svg xmlns="http://www.w3.org/2000/svg" aria-roledescription="class">
  <g class="classGroup" data-id="Animal"><rect fill="#1f2020" stroke="#ccc"/><text>Animal</text></g>
  <g class="classGroup" data-id="Dog"><rect fill="#1f2020" stroke="#ccc"/></g>
</svg>`

const ER = `<svg xmlns="http://www.w3.org/2000/svg" aria-roledescription="er">
  <g class="node" data-id="CUSTOMER"><rect class="label-container" fill="#1f2020" stroke="#ccc"/></g>
  <g class="node" data-id="ORDER"><rect class="label-container" fill="#1f2020" stroke="#ccc"/></g>
</svg>`

const GANTT = `<svg xmlns="http://www.w3.org/2000/svg" aria-roledescription="gantt">
  <rect class="section section0" fill="#b4ac76"/>
  <rect class="task task0" fill="#595c5c"/>
  <text>Research</text>
  <rect class="task task1" fill="#595c5c"/>
  <text>Wireframes</text>
</svg>`

describe('colorizePreview', () => {
  it('recolors unstyled flowchart nodes and skips clusters', () => {
    const { previewSvg, colored } = colorizePreview(FLOW, 'flowchart TD\nA-->B', 'dark', rng0)
    expect(colored).toBe(true)
    const nodeFills = fills(previewSvg, 'g.node .label-container')
    expect(nodeFills[0]).not.toBe('#1f2020')
    expect(PALETTES.dark.some((t) => t.fill === nodeFills[0])).toBe(true)
    expect(fills(previewSvg, 'g.cluster rect')[0]).toBe('#111')
  })

  it('leaves a style-fill id unchanged', () => {
    const src = 'flowchart TD\nA-->B\nstyle A fill:#f96'
    const { previewSvg } = colorizePreview(FLOW, src, 'dark', rng0)
    const a = new DOMParser()
      .parseFromString(previewSvg, 'image/svg+xml')
      .querySelector('g.node[data-id="A"] .label-container')
    expect(a?.getAttribute('fill')).toBe('#1f2020')
  })

  it('paints sequence top and bottom the same for one name', () => {
    const { previewSvg, colored } = colorizePreview(SEQ, 'sequenceDiagram\nparticipant User\nparticipant App', 'dark', rng0)
    expect(colored).toBe(true)
    const user = fills(previewSvg, 'rect.actor[name="User"]')
    expect(user[0]).toBe(user[1])
    expect(user[0]).not.toBe('#1f2020')
    const app = fills(previewSvg, 'rect.actor[name="App"]')
    expect(app[0]).not.toBe(user[0])
  })

  it('recolors class and er nodes', () => {
    expect(colorizePreview(CLASS, 'classDiagram', 'dark', rng0).colored).toBe(true)
    expect(colorizePreview(ER, 'erDiagram', 'dark', rng0).colored).toBe(true)
    expect(
      fills(colorizePreview(CLASS, 'classDiagram', 'dark', rng0).previewSvg, 'g.classGroup rect')[0],
    ).not.toBe('#1f2020')
  })

  it('recolors gantt tasks not sections and skips crit names', () => {
    const src = 'gantt\nResearch :crit, a1, 2026-01-01, 7d\nWireframes :a2, after a1, 5d'
    const { previewSvg } = colorizePreview(GANTT, src, 'dark', rng0)
    expect(fills(previewSvg, 'rect.section')[0]).toBe('#b4ac76')
    const tasks = fills(previewSvg, 'rect.task')
    expect(tasks[0]).toBe('#595c5c')
    expect(tasks[1]).not.toBe('#595c5c')
  })

  it('passthrough unsupported types', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" aria-roledescription="pie"></svg>'
    const r = colorizePreview(svg, 'pie', 'dark', rng0)
    expect(r.colored).toBe(false)
    expect(r.previewSvg).toBe(svg)
  })

  it('returns raw svg when XML is invalid', () => {
    const svg = '<not-svg'
    const r = colorizePreview(svg, 'flowchart TD', 'dark', rng0)
    expect(r.colored).toBe(false)
    expect(r.previewSvg).toBe(svg)
  })
})
