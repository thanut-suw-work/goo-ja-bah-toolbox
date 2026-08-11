export type IncludeKind = 'path' | 'stdlib'

export type IncludeHit = {
  fileLine: number
  quoted: string
  kind: IncludeKind
}

export type ParsedBlock = {
  startLine: number
  lines: string[]
  includeHit: IncludeHit | null
}

function splitLines(source: string): string[] {
  return source.split(/\r\n|\r|\n/)
}

function isDelimLine(line: string, token: string): boolean {
  const t = line.trim()
  if (!t.startsWith(token)) return false
  const next = t.charAt(token.length)
  return next === '' || !/[A-Za-z0-9_]/.test(next)
}

function isStartUml(line: string): boolean {
  return isDelimLine(line, '@startuml')
}

function isEndUml(line: string): boolean {
  return isDelimLine(line, '@enduml')
}

function scanInclude(lines: string[], startLine: number): IncludeHit | null {
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim()
    if (trimmed.startsWith("'")) continue
    const lower = trimmed.toLowerCase()
    if (!(lower.startsWith('!import') || lower.startsWith('!include'))) {
      continue
    }
    const m = trimmed.match(/^(!include\S*|!import)(?:\s+(\S+))?/i)
    const directive = m?.[1] ?? trimmed
    const includePath = m?.[2] ?? ''
    const quoted = includePath ? `${directive} ${includePath}` : directive
    const kind: IncludeKind =
      includePath.startsWith('<') && includePath.endsWith('>')
        ? 'stdlib'
        : 'path'
    return { fileLine: startLine + i, quoted, kind }
  }
  return null
}

function makeBlock(lines: string[], startLine: number): ParsedBlock {
  return { startLine, lines, includeHit: scanInclude(lines, startLine) }
}

export function parsePlantUml(source: string): ParsedBlock[] {
  const raw = splitLines(source)
  if (!raw.some(isStartUml)) {
    return [makeBlock(raw, 1)]
  }

  const blocks: ParsedBlock[] = []
  let current: { startLine: number; lines: string[] } | null = null

  for (let i = 0; i < raw.length; i++) {
    const line = raw[i]!
    const fileLine = i + 1
    if (isStartUml(line)) {
      if (current) {
        blocks.push(makeBlock(current.lines, current.startLine))
      }
      current = { startLine: fileLine, lines: [line] }
      continue
    }
    if (!current) continue
    current.lines.push(line)
    if (isEndUml(line)) {
      blocks.push(makeBlock(current.lines, current.startLine))
      current = null
    }
  }

  if (current) {
    blocks.push(makeBlock(current.lines, current.startLine))
  }
  return blocks
}

export function formatIncludeError(hit: IncludeHit): string {
  if (hit.kind === 'stdlib') {
    return `Line ${hit.fileLine}: ${hit.quoted} — stdlib not bundled. Inline what you need or remove the include.`
  }
  return `Line ${hit.fileLine}: ${hit.quoted} — this tool renders one file. Paste included contents into this diagram or remove the include.`
}
