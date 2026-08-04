import { describe, it, expect } from 'vitest'
import {
  timestampToIsoUtc,
  isoToUnixSeconds,
} from '@/tools/unix-timestamp/logic'

describe('unix timestamp', () => {
  it('converts seconds to ISO UTC', () => {
    expect(timestampToIsoUtc(0)).toEqual({
      ok: true,
      iso: '1970-01-01T00:00:00.000Z',
    })
  })

  it('parses ISO to seconds', () => {
    expect(isoToUnixSeconds('1970-01-01T00:00:00.000Z')).toEqual({
      ok: true,
      seconds: 0,
    })
  })

  it('rejects invalid number', () => {
    expect(timestampToIsoUtc(Number.NaN).ok).toBe(false)
  })
})
