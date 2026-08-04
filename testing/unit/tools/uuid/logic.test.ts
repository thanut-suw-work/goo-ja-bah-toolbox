import { describe, it, expect, vi } from 'vitest'
import { generateUuids } from '@/tools/uuid/logic'

describe('generateUuids', () => {
  it('returns n ids from crypto.randomUUID', () => {
    vi.stubGlobal('crypto', {
      randomUUID: vi
        .fn()
        .mockReturnValueOnce('a')
        .mockReturnValueOnce('b'),
    })
    expect(generateUuids(2)).toEqual(['a', 'b'])
  })
})
