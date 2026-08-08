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

const UTF16_BOM = [0xff, 0xfe] as const
const UTF32_BOM = [0xff, 0xfe, 0x00, 0x00] as const

function encodeUtf16Le(text: string, bom: boolean): Uint8Array {
  const units: number[] = []
  if (bom) units.push(0xfeff)
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    if (cp <= 0xffff) {
      units.push(cp)
    } else {
      const adj = cp - 0x10000
      units.push(0xd800 + (adj >> 10))
      units.push(0xdc00 + (adj & 0x3ff))
    }
  }
  const out = new Uint8Array(units.length * 2)
  for (let i = 0; i < units.length; i++) {
    out[i * 2] = units[i] & 0xff
    out[i * 2 + 1] = (units[i] >> 8) & 0xff
  }
  return out
}

function decodeUtf16Le(bytes: Uint8Array, bom: boolean): UtfDecodeResult {
  let offset = 0
  if (
    bom &&
    bytes.length >= 2 &&
    bytes[0] === UTF16_BOM[0] &&
    bytes[1] === UTF16_BOM[1]
  ) {
    offset = 2
  }
  const slice = bytes.subarray(offset)
  if (slice.length % 2 !== 0) {
    return { ok: false, error: 'Truncated UTF-16LE (odd byte length)' }
  }
  let text = ''
  for (let i = 0; i < slice.length; i += 2) {
    const unit = slice[i]! | (slice[i + 1]! << 8)
    if (unit >= 0xd800 && unit <= 0xdbff) {
      if (i + 3 >= slice.length) {
        return { ok: false, error: 'Lone high surrogate in UTF-16LE' }
      }
      const low = slice[i + 2]! | (slice[i + 3]! << 8)
      if (low < 0xdc00 || low > 0xdfff) {
        return { ok: false, error: 'Invalid surrogate pair in UTF-16LE' }
      }
      const cp = 0x10000 + ((unit - 0xd800) << 10) + (low - 0xdc00)
      text += String.fromCodePoint(cp)
      i += 2
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return { ok: false, error: 'Lone low surrogate in UTF-16LE' }
    } else {
      text += String.fromCodePoint(unit)
    }
  }
  return { ok: true, text }
}

function encodeUtf32Le(text: string, bom: boolean): Uint8Array {
  const cps: number[] = []
  if (bom) cps.push(0xfeff)
  for (const ch of text) cps.push(ch.codePointAt(0)!)
  const out = new Uint8Array(cps.length * 4)
  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i]!
    out[i * 4] = cp & 0xff
    out[i * 4 + 1] = (cp >> 8) & 0xff
    out[i * 4 + 2] = (cp >> 16) & 0xff
    out[i * 4 + 3] = (cp >> 24) & 0xff
  }
  return out
}

function decodeUtf32Le(bytes: Uint8Array, bom: boolean): UtfDecodeResult {
  let offset = 0
  if (
    bom &&
    bytes.length >= 4 &&
    bytes[0] === UTF32_BOM[0] &&
    bytes[1] === UTF32_BOM[1] &&
    bytes[2] === UTF32_BOM[2] &&
    bytes[3] === UTF32_BOM[3]
  ) {
    offset = 4
  }
  const slice = bytes.subarray(offset)
  if (slice.length % 4 !== 0) {
    return { ok: false, error: 'Truncated UTF-32LE (length not multiple of 4)' }
  }
  let text = ''
  for (let i = 0; i < slice.length; i += 4) {
    const cp =
      slice[i]! |
      (slice[i + 1]! << 8) |
      (slice[i + 2]! << 16) |
      (slice[i + 3]! << 24)
    const code = cp >>> 0
    if (code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
      return { ok: false, error: 'Invalid Unicode code point in UTF-32LE' }
    }
    text += String.fromCodePoint(code)
  }
  return { ok: true, text }
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
  if (encoding === 'utf-16le') {
    return formatHex(encodeUtf16Le(text, bom))
  }
  if (encoding === 'utf-32le') {
    return formatHex(encodeUtf32Le(text, bom))
  }
  const _exhaustive: never = encoding
  throw new Error(`encode not implemented: ${_exhaustive}`)
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
  if (encoding === 'utf-16le') {
    return decodeUtf16Le(bytes, bom)
  }
  if (encoding === 'utf-32le') {
    return decodeUtf32Le(bytes, bom)
  }
  const _exhaustive: never = encoding
  throw new Error(`decode not implemented: ${_exhaustive}`)
}
