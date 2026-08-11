import { describe, it, expect } from 'vitest'
import { formatIncludeError, parsePlantUml } from '@/tools/plantuml/parse'

describe('parsePlantUml blocks', () => {
  it('parses one @startuml block', () => {
    const src = ['@startuml', 'Alice -> Bob: hi', '@enduml'].join('\n')
    const blocks = parsePlantUml(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.startLine).toBe(1)
    expect(blocks[0]!.lines).toEqual([
      '@startuml',
      'Alice -> Bob: hi',
      '@enduml',
    ])
  })

  it('parses several blocks in file order', () => {
    const src = [
      '@startuml',
      'A -> B',
      '@enduml',
      '@startuml',
      'C -> D',
      '@enduml',
    ].join('\n')
    const blocks = parsePlantUml(src)
    expect(blocks).toHaveLength(2)
    expect(blocks[0]!.startLine).toBe(1)
    expect(blocks[1]!.startLine).toBe(4)
    expect(blocks[1]!.lines[1]).toBe('C -> D')
  })

  it('treats @startuml id as a start token', () => {
    const src = ['@startuml hello', 'Alice -> Bob', '@enduml'].join('\n')
    const blocks = parsePlantUml(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.lines[0]).toBe('@startuml hello')
  })

  it('uses the whole buffer as one block when there is no @startuml', () => {
    const src = 'Alice -> Bob: hi'
    const blocks = parsePlantUml(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.startLine).toBe(1)
    expect(blocks[0]!.lines).toEqual(['Alice -> Bob: hi'])
  })

  it('emits an unclosed block at EOF', () => {
    const src = ['@startuml', 'Alice -> Bob'].join('\n')
    const blocks = parsePlantUml(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.lines).toEqual(['@startuml', 'Alice -> Bob'])
  })

  it('discards junk between blocks', () => {
    const src = [
      '@startuml',
      'A -> B',
      '@enduml',
      'this is discarded',
      '@startuml',
      'C -> D',
      '@enduml',
    ].join('\n')
    const blocks = parsePlantUml(src)
    expect(blocks).toHaveLength(2)
    expect(blocks.map((b) => b.lines.join('\n')).join('|')).not.toContain(
      'discarded',
    )
    expect(blocks[1]!.startLine).toBe(5)
  })

  it('records startLine of a second block as the file line of its @startuml', () => {
    const src = [
      'preamble',
      '@startuml',
      'A -> B',
      '@enduml',
      '',
      '@startuml',
      'C -> D',
      '@enduml',
    ].join('\n')
    const blocks = parsePlantUml(src)
    expect(blocks[0]!.startLine).toBe(2)
    expect(blocks[1]!.startLine).toBe(6)
  })

  it('is case-sensitive: @STARTUML is not a start token', () => {
    const src = ['@STARTUML', 'Alice -> Bob', '@enduml'].join('\n')
    const blocks = parsePlantUml(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.startLine).toBe(1)
    expect(blocks[0]!.lines[0]).toBe('@STARTUML')
  })

  it('does not treat @startumlfoo as a start token', () => {
    const src = ['@startumlfoo', 'Alice -> Bob'].join('\n')
    const blocks = parsePlantUml(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.lines[0]).toBe('@startumlfoo')
  })

  it('starts a new block if @startuml appears while the previous is unclosed', () => {
    const src = ['@startuml', 'A -> B', '@startuml', 'C -> D', '@enduml'].join(
      '\n',
    )
    const blocks = parsePlantUml(src)
    expect(blocks).toHaveLength(2)
    expect(blocks[0]!.lines).toEqual(['@startuml', 'A -> B'])
    expect(blocks[1]!.startLine).toBe(3)
  })
})

describe('parsePlantUml include scan', () => {
  it('hits !include path with file line and path error copy', () => {
    const src = [
      '@startuml',
      'Alice -> Bob',
      '!include common.puml',
      '@enduml',
    ].join('\n')
    const blocks = parsePlantUml(src)
    expect(blocks[0]!.includeHit).toEqual({
      fileLine: 3,
      quoted: '!include common.puml',
      kind: 'path',
    })
    expect(formatIncludeError(blocks[0]!.includeHit!)).toBe(
      'Line 3: !include common.puml — this tool renders one file. Paste included contents into this diagram or remove the include.',
    )
  })

  it('hits stdlib angle-bracket include with stdlib error copy', () => {
    const src = [
      '@startuml',
      '!include <c4/C4_Container>',
      'A -> B',
      '@enduml',
    ].join('\n')
    const hit = parsePlantUml(src)[0]!.includeHit
    expect(hit).toEqual({
      fileLine: 2,
      quoted: '!include <c4/C4_Container>',
      kind: 'stdlib',
    })
    expect(formatIncludeError(hit!)).toBe(
      'Line 2: !include <c4/C4_Container> — stdlib not bundled. Inline what you need or remove the include.',
    )
  })

  it('hits !includeurl, !import, !include_once, !includesub, !include_many', () => {
    const kinds = [
      '!includeurl https://example.com/x.puml',
      '!import foo.puml',
      '!include_once once.puml',
      '!includesub lib.puml!SUB',
      '!include_many many.puml',
    ]
    for (const directiveLine of kinds) {
      const src = ['@startuml', directiveLine, '@enduml'].join('\n')
      const hit = parsePlantUml(src)[0]!.includeHit
      expect(hit, directiveLine).not.toBeNull()
      expect(hit!.kind).toBe('path')
      expect(hit!.fileLine).toBe(2)
      expect(hit!.quoted).toBe(directiveLine)
    }
  })

  it('is case-insensitive for the include prefix and quotes the line as written', () => {
    const src = ['@startuml', '!INCLUDE common.puml', '@enduml'].join('\n')
    const hit = parsePlantUml(src)[0]!.includeHit
    expect(hit!.quoted).toBe('!INCLUDE common.puml')
    expect(hit!.kind).toBe('path')
  })

  it('does not treat a \' commented include as a hit', () => {
    const src = [
      '@startuml',
      "' !include common.puml",
      'Alice -> Bob',
      '@enduml',
    ].join('\n')
    expect(parsePlantUml(src)[0]!.includeHit).toBeNull()
  })

  it('still hits an include inside a block comment (known scanner limit)', () => {
    const src = [
      '@startuml',
      "/'",
      '!include common.puml',
      "'/",
      'Alice -> Bob',
      '@enduml',
    ].join('\n')
    expect(parsePlantUml(src)[0]!.includeHit?.fileLine).toBe(3)
  })

  it('uses file line numbers for an include in a second block', () => {
    const src = [
      '@startuml',
      'A -> B',
      '@enduml',
      '@startuml',
      '!include other.puml',
      '@enduml',
    ].join('\n')
    expect(parsePlantUml(src)[1]!.includeHit?.fileLine).toBe(5)
  })

  it('matches the spec Line 4 path-include sentence', () => {
    const src = [
      '@startuml',
      'A -> B',
      'C -> D',
      '!include common.puml',
      '@enduml',
    ].join('\n')
    const hit = parsePlantUml(src)[0]!.includeHit
    expect(formatIncludeError(hit!)).toBe(
      'Line 4: !include common.puml — this tool renders one file. Paste included contents into this diagram or remove the include.',
    )
  })

  it('matches the spec Line 4 stdlib sentence', () => {
    const src = [
      '@startuml',
      'A -> B',
      'C -> D',
      '!include <c4/C4_Container>',
      '@enduml',
    ].join('\n')
    const hit = parsePlantUml(src)[0]!.includeHit
    expect(formatIncludeError(hit!)).toBe(
      'Line 4: !include <c4/C4_Container> — stdlib not bundled. Inline what you need or remove the include.',
    )
  })
})

