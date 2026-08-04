function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function encodeBase64(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text))
}

export type DecodeResult =
  | { ok: true; text: string }
  | { ok: false; error: string }

export function decodeBase64(b64: string): DecodeResult {
  try {
    const cleaned = b64.replace(/\s+/g, '')
    const text = new TextDecoder().decode(base64ToBytes(cleaned))
    return { ok: true, text }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Invalid Base64',
    }
  }
}
