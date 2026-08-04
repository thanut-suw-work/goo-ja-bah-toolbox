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

  it('includes json-formatter', () => {
    expect(tools.some((t) => t.id === 'json-formatter')).toBe(true)
  })

  it('includes base64', () => {
    expect(tools.some((t) => t.id === 'base64')).toBe(true)
  })
})
