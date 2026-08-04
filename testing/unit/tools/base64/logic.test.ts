import { describe, it, expect } from 'vitest'
import { encodeBase64, decodeBase64 } from '@/tools/base64/logic'

describe('base64', () => {
  it('encodes utf-8 text', () => {
    expect(encodeBase64('hi')).toBe(btoa('hi'))
  })

  it('decodes round-trip', () => {
    const r = decodeBase64(encodeBase64('café'))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.text).toBe('café')
  })

  it('errors on invalid base64', () => {
    const r = decodeBase64('@@@')
    expect(r.ok).toBe(false)
  })
})
