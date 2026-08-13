import { describe, it, expect } from 'vitest'
import { PALETTES, shuffle, takeColor } from '@/tools/mermaid/palette'

const BRASS = ['#d99a3f', '#e7ab55', '#a35a17']
const PURPLE = ['#6e3cff', '#7c3aed', '#8b5cf6', '#6366f1', '#4f46e5']

describe('PALETTES', () => {
  it('has 8 triples for dark and default', () => {
    expect(PALETTES.dark).toHaveLength(8)
    expect(PALETTES.default).toHaveLength(8)
  })

  it('uses spec label colors', () => {
    for (const t of PALETTES.dark) expect(t.label).toBe('#e6edf3')
    for (const t of PALETTES.default) expect(t.label).toBe('#14171d')
  })

  it('contains no brass purple or indigo hexes', () => {
    const hexes = [...PALETTES.dark, ...PALETTES.default].flatMap((t) => [
      t.fill.toLowerCase(),
      t.stroke.toLowerCase(),
      t.label.toLowerCase(),
    ])
    for (const banned of [...BRASS, ...PURPLE]) {
      expect(hexes).not.toContain(banned)
    }
  })

  it('locks spec fill and stroke pairs', () => {
    expect(PALETTES.dark.map((t) => [t.fill, t.stroke])).toEqual([
      ['#2f5d50', '#7aa894'],
      ['#35536e', '#7a9bb8'],
      ['#6b5344', '#c4a890'],
      ['#3d5c5c', '#7aabab'],
      ['#5c4a32', '#c4a878'],
      ['#4a5a3c', '#9bb07a'],
      ['#5a4040', '#c49090'],
      ['#3c4a5c', '#7a90a8'],
    ])
    expect(PALETTES.default.map((t) => [t.fill, t.stroke])).toEqual([
      ['#c5d9ce', '#2f5d50'],
      ['#c5d0dc', '#35536e'],
      ['#e2d4c4', '#6b5344'],
      ['#c5d6d6', '#3d5c5c'],
      ['#ddd4c4', '#5c4a32'],
      ['#d4dcc5', '#4a5a3c'],
      ['#e0cccc', '#5a4040'],
      ['#d0d4dc', '#3c4a5c'],
    ])
  })
})

describe('shuffle', () => {
  it('is a permutation of the input', () => {
    const rng = (() => {
      let i = 0
      const seq = [0.1, 0.9, 0.3, 0.7, 0.2, 0.8, 0.4, 0.6]
      return () => seq[i++ % seq.length]!
    })()
    const src = [0, 1, 2, 3, 4, 5, 6, 7]
    const out = shuffle(src, rng)
    expect([...out].sort((a, b) => a - b)).toEqual(src)
    expect(out).not.toEqual(src)
  })
})

describe('takeColor', () => {
  it('wraps and skips an immediate repeat', () => {
    const colors = [
      { fill: 'a', stroke: 's', label: 'l' },
      { fill: 'b', stroke: 's', label: 'l' },
    ]
    const c = { cursor: 0 }
    const first = takeColor(colors, c, null)
    expect(first.fill).toBe('a')
    c.cursor = 2
    const wrapped = takeColor(colors, c, 'a')
    expect(wrapped.fill).toBe('b')
  })
})
