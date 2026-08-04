import { describe, it, expect } from 'vitest'
import { formatJson } from '@/tools/json-formatter/logic'

describe('formatJson', () => {
  it('prettifies valid json', () => {
    const r = formatJson('{"a":1}', 'pretty')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.text).toBe('{\n  "a": 1\n}')
  })

  it('minifies valid json', () => {
    const r = formatJson('{\n  "a": 1\n}', 'minify')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.text).toBe('{"a":1}')
  })

  it('returns error on invalid json', () => {
    const r = formatJson('{', 'pretty')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.length).toBeGreaterThan(0)
  })
})
