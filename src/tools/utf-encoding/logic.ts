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

export function encodeUtf(
  text: string,
  encoding: UtfEncoding,
  bom: boolean,
): string {
  if (encoding === 'utf-8') {
    void bom
    return formatHex(new TextEncoder().encode(text))
  }
  throw new Error(`encode not implemented: ${encoding}`)
}

export function decodeUtf(
  hex: string,
  encoding: UtfEncoding,
  bom: boolean,
): UtfDecodeResult {
  const parsed = parseHex(hex)
  if (!parsed.ok) return parsed
  let bytes = parsed.bytes
  if (encoding === 'utf-8') {
    void bom
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      return { ok: true, text }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Invalid UTF-8',
      }
    }
  }
  throw new Error(`decode not implemented: ${encoding}`)
}
