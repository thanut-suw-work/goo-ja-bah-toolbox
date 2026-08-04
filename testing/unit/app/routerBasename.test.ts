import { describe, it, expect } from 'vitest'
import { routerBasename } from '@/app/routerBasename'

describe('routerBasename', () => {
  it('returns empty string for root base', () => {
    expect(routerBasename('/')).toBe('')
  })

  it('strips trailing slash from project base', () => {
    expect(routerBasename('/goo-ja-bah-toolbox/')).toBe('/goo-ja-bah-toolbox')
  })

  it('leaves already-clean path unchanged', () => {
    expect(routerBasename('/goo-ja-bah-toolbox')).toBe('/goo-ja-bah-toolbox')
  })
})
