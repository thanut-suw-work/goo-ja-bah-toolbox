import { describe, it, expect } from 'vitest'
import { DEFAULT_STEM, stemFromFilename } from '@/tools/svg-to-image/stem'

describe('stemFromFilename', () => {
  it('default stem is image', () => {
    expect(DEFAULT_STEM).toBe('image')
  })

  it('strips the last extension and any directory prefix', () => {
    expect(stemFromFilename('logo.svg')).toBe('logo')
    expect(stemFromFilename('my.diagram.svg')).toBe('my.diagram')
    expect(stemFromFilename('/tmp/a/b.svg')).toBe('b')
    expect(stemFromFilename('C:\\x\\y.svg')).toBe('y')
  })

  it('keeps names with no extension; empty → image', () => {
    expect(stemFromFilename('diagram')).toBe('diagram')
    expect(stemFromFilename('')).toBe('image')
    expect(stemFromFilename('   ')).toBe('image')
  })
})
