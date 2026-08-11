import { describe, it, expect } from 'vitest'
import {
  decodeUtf,
  encodeUtf,
  formatCodePoints,
  formatHex,
  parseCodePoints,
  parseHex,
} from '@/tools/utf-encoding/logic'

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

describe('formatCodePoints / parseCodePoints', () => {
  it('formats unpadded uppercase 0x tokens', () => {
    expect(formatCodePoints('testtt อิ')).toBe(
      '0x74 0x65 0x73 0x74 0x74 0x74 0x20 0xE2D 0xE34',
    )
  })

  it('formats emoji as a scalar not surrogates', () => {
    expect(formatCodePoints('😀')).toBe('0x1F600')
  })

  it('formats NUL as 0x0', () => {
    expect(formatCodePoints('\0')).toBe('0x0')
  })

  it('parses padded, unpadded, commas, and missing 0x', () => {
    const a = parseCodePoints('0x74 0xE2D')
    const b = parseCodePoints('0x0E2D')
    const c = parseCodePoints('74,e2d')
    const d = parseCodePoints('0x74\n0x65')
    expect(a.ok && b.ok && c.ok && d.ok).toBe(true)
    if (a.ok && b.ok && c.ok && d.ok) {
      expect(a.codePoints).toEqual([0x74, 0xe2d])
      expect(b.codePoints).toEqual([0xe2d])
      expect(c.codePoints).toEqual([0x74, 0xe2d])
      expect(d.codePoints).toEqual([0x74, 0x65])
    }
  })

  it('errors on empty input', () => {
    const r = parseCodePoints('   ,  ')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('Empty code point input')
  })

  it('errors on non-hex and lone 0x', () => {
    const a = parseCodePoints('0xzz')
    const b = parseCodePoints('0x')
    expect(a.ok).toBe(false)
    expect(b.ok).toBe(false)
    if (!a.ok) expect(a.error).toBe('Invalid hex characters')
    if (!b.ok) expect(b.error).toBe('Invalid hex characters')
  })

  it('errors on out-of-range and surrogates', () => {
    const a = parseCodePoints('0x110000')
    const b = parseCodePoints('0xD800')
    expect(a.ok).toBe(false)
    expect(b.ok).toBe(false)
    if (!a.ok) expect(a.error).toBe('Invalid Unicode code point')
    if (!b.ok) expect(b.error).toBe('Surrogate code point')
  })
})

describe('utf-8', () => {
  it('round-trips ASCII and accented text', () => {
    const hex = encodeUtf('café', 'utf-8', false)
    expect(hex).toBe('63 61 66 C3 A9')
    const r = decodeUtf(hex, 'utf-8', false)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.text).toBe('café')
  })

  it('round-trips emoji', () => {
    const hex = encodeUtf('😀', 'utf-8', false)
    const r = decodeUtf(hex, 'utf-8', false)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.text).toBe('😀')
  })

  it('errors on invalid utf-8 bytes', () => {
    const r = decodeUtf('FF', 'utf-8', false)
    expect(r.ok).toBe(false)
  })

  it('ignores bom flag for utf-8 encode', () => {
    expect(encodeUtf('A', 'utf-8', true)).toBe('41')
  })
})

describe('utf-16le', () => {
  it('encodes ASCII without BOM', () => {
    expect(encodeUtf('Hi', 'utf-16le', false)).toBe('48 00 69 00')
  })

  it('encodes with BOM when requested', () => {
    expect(encodeUtf('A', 'utf-16le', true)).toBe('FF FE 41 00')
  })

  it('round-trips emoji (surrogate pair)', () => {
    const hex = encodeUtf('😀', 'utf-16le', false)
    const r = decodeUtf(hex, 'utf-16le', false)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.text).toBe('😀')
  })

  it('strips BOM on decode only when bom flag on', () => {
    const withBom = encodeUtf('A', 'utf-16le', true)
    const stripped = decodeUtf(withBom, 'utf-16le', true)
    expect(stripped.ok && stripped.text).toBe('A')
    // bom off: leading FF FE decoded as code units → U+FEFF + 'A'
    const kept = decodeUtf(withBom, 'utf-16le', false)
    expect(kept.ok).toBe(true)
    if (kept.ok) expect(kept.text).toBe('\uFEFFA')
  })

  it('errors on truncated code unit', () => {
    const r = decodeUtf('48', 'utf-16le', false)
    expect(r.ok).toBe(false)
  })

  it('errors on lone high surrogate', () => {
    // U+D800 alone LE: 00 D8
    const r = decodeUtf('00 D8', 'utf-16le', false)
    expect(r.ok).toBe(false)
  })
})

describe('utf-32le', () => {
  it('encodes ASCII without BOM', () => {
    expect(encodeUtf('A', 'utf-32le', false)).toBe('41 00 00 00')
  })

  it('encodes with BOM when requested', () => {
    expect(encodeUtf('A', 'utf-32le', true)).toBe('FF FE 00 00 41 00 00 00')
  })

  it('round-trips emoji', () => {
    const hex = encodeUtf('😀', 'utf-32le', false)
    const r = decodeUtf(hex, 'utf-32le', false)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.text).toBe('😀')
  })

  it('strips BOM on decode only when bom flag on', () => {
    const withBom = encodeUtf('A', 'utf-32le', true)
    const stripped = decodeUtf(withBom, 'utf-32le', true)
    expect(stripped.ok && stripped.text).toBe('A')
  })

  it('errors on truncated code point', () => {
    const r = decodeUtf('41 00', 'utf-32le', false)
    expect(r.ok).toBe(false)
  })

  it('errors on surrogate code point', () => {
    const r = decodeUtf('00 D8 00 00', 'utf-32le', false)
    expect(r.ok).toBe(false)
  })

  it('errors on out-of-range code point', () => {
    const r = decodeUtf('00 00 11 00', 'utf-32le', false) // 0x110000
    expect(r.ok).toBe(false)
  })
})
