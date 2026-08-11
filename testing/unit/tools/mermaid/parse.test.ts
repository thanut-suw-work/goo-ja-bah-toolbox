import { describe, it, expect } from 'vitest'
import { parseMermaid } from '@/tools/mermaid/parse'

describe('parseMermaid', () => {
  it('uses the whole buffer as one block when there is no mermaid fence', () => {
    const src = 'flowchart TD\n  A-->B'
    const blocks = parseMermaid(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.startLine).toBe(1)
    expect(blocks[0]!.text).toBe(src)
  })

  it('preserves CRLF whole-buffer text', () => {
    const src = 'flowchart TD\r\n  A-->B'
    expect(parseMermaid(src)[0]!.text).toBe(src)
  })

  it('parses several mermaid fences in file order', () => {
    const src = [
      '# title',
      '```mermaid',
      'flowchart TD',
      '  A-->B',
      '```',
      'prose',
      '```mermaid',
      'sequenceDiagram',
      '  Alice->>Bob: hi',
      '```',
    ].join('\n')
    const blocks = parseMermaid(src)
    expect(blocks).toHaveLength(2)
    expect(blocks[0]!.startLine).toBe(3)
    expect(blocks[0]!.text).toBe('flowchart TD\n  A-->B')
    expect(blocks[1]!.startLine).toBe(8)
    expect(blocks[1]!.text).toContain('Alice->>Bob: hi')
    expect(blocks.map((b) => b.text).join('|')).not.toContain('prose')
    expect(blocks.map((b) => b.text).join('|')).not.toContain('# title')
  })

  it('treats mmd info string and Mermaid case-insensitive as fences', () => {
    const src = [
      '```mmd',
      'flowchart TD',
      '  A-->B',
      '```',
      '```Mermaid',
      'flowchart TD',
      '  C-->D',
      '```',
    ].join('\n')
    expect(parseMermaid(src)).toHaveLength(2)
  })

  it('counts info-string extra tokens', () => {
    const src = ['```mermaid title=foo', 'flowchart TD', '  A-->B', '```'].join(
      '\n',
    )
    expect(parseMermaid(src)).toHaveLength(1)
    expect(parseMermaid(src)[0]!.text).toBe('flowchart TD\n  A-->B')
  })

  it('ignores js, plantuml, and mermaidjs fences', () => {
    const src = [
      '```js',
      'console.log(1)',
      '```',
      '```plantuml',
      '@startuml',
      '@enduml',
      '```',
      '```mermaidjs',
      'flowchart TD',
      '```',
    ].join('\n')
    const blocks = parseMermaid(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.startLine).toBe(1)
    expect(blocks[0]!.text).toBe(src)
  })

  it('parses tilde mermaid fences', () => {
    const src = ['~~~mermaid', 'flowchart TD', '  A-->B', '~~~'].join('\n')
    const blocks = parseMermaid(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.startLine).toBe(2)
    expect(blocks[0]!.text).toBe('flowchart TD\n  A-->B')
  })

  it('emits an unclosed fence at EOF', () => {
    const src = ['```mermaid', 'flowchart TD', '  A-->B'].join('\n')
    const blocks = parseMermaid(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.startLine).toBe(2)
    expect(blocks[0]!.text).toBe('flowchart TD\n  A-->B')
  })

  it('does not treat a 4-space indented opener as a fence', () => {
    const src = ['    ```mermaid', 'flowchart TD', '    ```'].join('\n')
    const blocks = parseMermaid(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.text).toBe(src)
  })

  it('does not include fence marker lines in engine text', () => {
    const src = ['```mermaid', 'flowchart TD', '```'].join('\n')
    expect(parseMermaid(src)[0]!.text).toBe('flowchart TD')
    expect(parseMermaid(src)[0]!.text).not.toContain('```')
  })
})
