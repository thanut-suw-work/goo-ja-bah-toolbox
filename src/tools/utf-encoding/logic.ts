export type UtfEncoding = 'utf-8' | 'utf-16le' | 'utf-32le'

export type HexParseResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; error: string }

export type UtfDecodeResult =
  | { ok: true; text: string }
  | { ok: false; error: string }

export function formatHex(bytes: Uint8Array): string {
  return [...bytes]
    .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ')
}

export function parseHex(input: string): HexParseResult {
  let s = input.replace(/0x/gi, '').replace(/[\s,]/g, '')
  if (s.length === 0) return { ok: false, error: 'Empty hex input' }
  if (s.length % 2 !== 0) {
    return { ok: false, error: 'Odd hex length (incomplete byte)' }
  }
  if (!/^[0-9a-fA-F]+$/.test(s)) {
    return { ok: false, error: 'Invalid hex characters' }
  }
  const bytes = new Uint8Array(s.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(s.slice(i * 2, i * 2 + 2), 16)
  }
  return { ok: true, bytes }
}
