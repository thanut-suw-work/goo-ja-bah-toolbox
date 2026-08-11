import { describe, it, expect, vi, beforeEach } from 'vitest'

const initialize = vi.fn()
const render = vi.fn(async () => ({ svg: '<svg></svg>' }))

vi.mock('mermaid', () => ({
  default: { initialize, render },
}))

import { renderBlock } from '@/tools/mermaid/render'

describe('renderBlock theme', () => {
  beforeEach(() => {
    initialize.mockClear()
    render.mockClear()
  })

  it('initializes with theme dark', async () => {
    const r = await renderBlock('flowchart TD', 1, 'dark')
    expect(r.ok).toBe(true)
    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({
        securityLevel: 'strict',
        theme: 'dark',
        startOnLoad: false,
      }),
    )
  })

  it('initializes with theme default', async () => {
    await renderBlock('flowchart TD', 1, 'default')
    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'default', securityLevel: 'strict' }),
    )
  })
})
