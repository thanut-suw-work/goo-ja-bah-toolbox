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

  it('starts with zero tools before features land', () => {
    expect(tools.length).toBe(0)
  })
})
