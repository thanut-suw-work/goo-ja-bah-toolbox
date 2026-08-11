import { describe, it, expect } from 'vitest'
import { tools, getToolById } from '@/tools/registry'

describe('registry', () => {
  it('exposes unique ids', () => {
    const ids = tools.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('getToolById returns undefined for unknown', () => {
    expect(getToolById('nope')).toBeUndefined()
  })

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
      'plantuml',
      'svg-to-image',
    ]
    expect(tools.map((t) => t.id).sort()).toEqual([...expected].sort())
  })
})
