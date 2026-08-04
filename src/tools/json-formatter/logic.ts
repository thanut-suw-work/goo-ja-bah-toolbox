export type FormatMode = 'pretty' | 'minify'

export type FormatResult =
  | { ok: true; text: string }
  | { ok: false; error: string }

export function formatJson(input: string, mode: FormatMode): FormatResult {
  try {
    const value = JSON.parse(input)
    const text =
      mode === 'pretty' ? JSON.stringify(value, null, 2) : JSON.stringify(value)
    return { ok: true, text }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Invalid JSON',
    }
  }
}
