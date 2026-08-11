export type ParsedBlock = {
  startLine: number
  text: string
}

function splitLines(source: string): string[] {
  return source.split(/\r\n|\r|\n/)
}

function infoIsMermaid(info: string): boolean {
  const first = info.trim().split(/\s+/)[0] ?? ''
  const lang = first.toLowerCase()
  return lang === 'mermaid' || lang === 'mmd'
}

function isCloser(line: string, char: string, len: number): boolean {
  const m = line.match(/^( {0,3})([`~]{3,})\s*$/)
  if (!m) return false
  if (m[2]![0] !== char) return false
  return m[2]!.length >= len
}

export function parseMermaid(source: string): ParsedBlock[] {
  const raw = splitLines(source)
  const blocks: ParsedBlock[] = []
  let open: {
    char: string
    len: number
    startLine: number
    lines: string[]
  } | null = null

  for (let i = 0; i < raw.length; i++) {
    const line = raw[i]!
    if (open) {
      if (isCloser(line, open.char, open.len)) {
        blocks.push({
          startLine: open.startLine,
          text: open.lines.join('\n'),
        })
        open = null
      } else {
        open.lines.push(line)
      }
      continue
    }
    const m = line.match(/^( {0,3})([`~]{3,})(.*)$/)
    if (!m) continue
    if (!infoIsMermaid(m[3] ?? '')) continue
    const fence = m[2]!
    open = {
      char: fence[0]!,
      len: fence.length,
      startLine: i + 2,
      lines: [],
    }
  }

  if (open) {
    blocks.push({ startLine: open.startLine, text: open.lines.join('\n') })
  }

  if (blocks.length === 0) {
    return [{ startLine: 1, text: source }]
  }
  return blocks
}
