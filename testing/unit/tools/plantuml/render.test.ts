import { describe, it, expect } from 'vitest'
import { mapEngineError } from '@/tools/plantuml/render'

describe('mapEngineError', () => {
  it('returns the raw message when no line number is present', () => {
    expect(mapEngineError('Syntax Error?', 10)).toEqual({
      error: 'Syntax Error?',
      line: null,
    })
  })

  it('maps a block-relative line onto the file line', () => {
    // engine line 3, block starts at file line 10 → file line 12
    const r = mapEngineError('Error line 3 in diagram', 10)
    expect(r.line).toBe(12)
    expect(r.error).toBe('Line 12: Error line 12 in diagram')
  })

  it('keeps engine line = file line when startLine is 1 (no-marker block)', () => {
    const r = mapEngineError('Error line 4', 1)
    expect(r.line).toBe(4)
    expect(r.error).toBe('Line 4: Error line 4')
  })
})
