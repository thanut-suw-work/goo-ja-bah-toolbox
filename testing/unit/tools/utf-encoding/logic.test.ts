import { describe, it, expect } from 'vitest'
import { formatHex, parseHex } from '@/tools/utf-encoding/logic'

describe('formatHex / parseHex', () => {
  it('formats uppercase spaced hex', () => {
    expect(formatHex(new Uint8Array([0x48, 0x65, 0x6c]))).toBe('48 65 6C')
  })

  it('parses spaced, continuous, 0x, and commas', () => {
    const a = parseHex('48 65 6C')
    const b = parseHex('48656c')
    const c = parseHex('0x48,0x65,0x6C')
    expect(a.ok && b.ok && c.ok).toBe(true)
    if (a.ok && b.ok && c.ok) {
      expect([...a.bytes]).toEqual([0x48, 0x65, 0x6c])
      expect([...b.bytes]).toEqual([0x48, 0x65, 0x6c])
      expect([...c.bytes]).toEqual([0x48, 0x65, 0x6c])
    }
  })

  it('errors on odd nibble length', () => {
    const r = parseHex('486')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/odd|length|nibble/i)
  })

  it('errors on non-hex', () => {
    const r = parseHex('zz')
    expect(r.ok).toBe(false)
  })
})
