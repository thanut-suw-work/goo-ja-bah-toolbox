import { describe, it, expect } from 'vitest'
import { normalizePageRange } from '@/tools/pdf-to-image/range'

describe('normalizePageRange', () => {
  it('accepts valid inclusive range (1-3 of 5)', () => {
    expect(normalizePageRange(1, 3, 5)).toEqual({
      ok: true,
      from: 1,
      to: 3,
    })
  })

  it('rejects from > to', () => {
    expect(normalizePageRange(4, 2, 5).ok).toBe(false)
  })

  it('rejects out of bounds', () => {
    expect(normalizePageRange(0, 1, 5).ok).toBe(false)
    expect(normalizePageRange(1, 6, 5).ok).toBe(false)
  })

  it('rejects non-integer pages', () => {
    expect(normalizePageRange(1.5, 3, 5).ok).toBe(false)
    expect(normalizePageRange(1, 3.2, 5).ok).toBe(false)
  })
})
