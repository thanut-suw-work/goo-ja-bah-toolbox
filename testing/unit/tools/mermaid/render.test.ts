import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { mapEngineError } from '@/tools/mermaid/render'

describe('mapEngineError', () => {
  it('returns the raw message when no line number is present', () => {
    expect(mapEngineError('Syntax error', 10)).toEqual({
      error: 'Syntax error',
      line: null,
    })
  })

  it('maps a block-relative line onto the file line', () => {
    const r = mapEngineError('Parse error on line 3:', 10)
    expect(r.line).toBe(12)
    expect(r.error).toBe('Line 12: Parse error on line 12:')
  })

  it('keeps engine line = file line when startLine is 1', () => {
    const r = mapEngineError('Error line 4', 1)
    expect(r.line).toBe(4)
    expect(r.error).toBe('Line 4: Error line 4')
  })

  it('stringifies a non-string engine payload instead of throwing', () => {
    const r = mapEngineError(undefined, 1)
    expect(r.line).toBeNull()
    expect(r.error.length).toBeGreaterThan(0)
  })

  it('uses Mermaid engine error when the message is empty', () => {
    expect(mapEngineError('', 1).error).toBe('Mermaid engine error')
  })
})

describe('engine load wiring', () => {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(
    path.resolve(here, '../../../../src/tools/mermaid/render.ts'),
    'utf8',
  )

  it('dynamic-imports mermaid so Vite can split the chunk', () => {
    expect(src).toMatch(/import\(['"]mermaid['"]\)/)
  })

  it('forces securityLevel strict and never registers icon packs', () => {
    expect(src).toMatch(/securityLevel:\s*['"]strict['"]/)
    expect(src).not.toMatch(/registerIconPacks/)
    expect(src).not.toMatch(/securityLevel:\s*['"]loose['"]/)
    expect(src).not.toMatch(/securityLevel:\s*['"]antiscript['"]/)
    expect(src).not.toMatch(/startOnLoad:\s*true/)
  })

  it('disables gantt useMaxWidth so wide charts keep pixel size', () => {
    expect(src).toMatch(/gantt:\s*\{[^}]*useMaxWidth:\s*false/)
  })

  it('re-asserts theme from the renderBlock argument', () => {
    expect(src).toMatch(
      /export function renderBlock\(\s*text:\s*string,\s*startLine:\s*number,\s*theme:\s*'dark'\s*\|\s*'default'/,
    )
  })
})
