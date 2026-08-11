import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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

  it('stringifies a non-string engine payload instead of throwing', () => {
    const r = mapEngineError(undefined, 1)
    expect(r.line).toBeNull()
    expect(r.error.length).toBeGreaterThan(0)
  })

  it('rewrites a TeaVM monitor crash into an engine-card message', () => {
    const r = mapEngineError(
      `can't access property "bGH", e is undefined`,
      1,
    )
    expect(r.line).toBeNull()
    expect(r.error).toMatch(/PlantUML engine crashed/i)
    expect(r.error).toContain('bGH')
  })

  it('rewrites a Chromium TeaVM TypeError the same way', () => {
    const r = mapEngineError(
      `Cannot read properties of undefined (reading 'bGH')`,
      1,
    )
    expect(r.line).toBeNull()
    expect(r.error).toMatch(/PlantUML engine crashed/i)
  })
})

describe('engine load wiring', () => {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(
    path.resolve(here, '../../../../src/tools/plantuml/render.ts'),
    'utf8',
  )

  it('loads plantuml.js as a URL asset so Vite cannot minify TeaVM', () => {
    expect(src).toMatch(
      /import\(['"]@plantuml\/core\/plantuml\.js\?url['"]\)/,
    )
    expect(src).not.toMatch(
      /import\(['"]@plantuml\/core\/plantuml\.js['"]\)/,
    )
  })

  it('passes { dark } into renderToString', () => {
    expect(src).toMatch(/renderToStringP\([\s\S]*dark/)
    expect(src).toMatch(/\{\s*dark\s*\}/)
    expect(src).toMatch(
      /export function renderBlock\(\s*lines:\s*string\[\],\s*startLine:\s*number,\s*dark:\s*boolean/,
    )
  })
})
