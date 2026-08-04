export type TsResult =
  | { ok: true; iso: string }
  | { ok: false; error: string }

export type SecResult =
  | { ok: true; seconds: number }
  | { ok: false; error: string }

export function timestampToIsoUtc(seconds: number): TsResult {
  if (!Number.isFinite(seconds)) {
    return { ok: false, error: 'Invalid timestamp' }
  }
  const d = new Date(seconds * 1000)
  if (Number.isNaN(d.getTime())) {
    return { ok: false, error: 'Invalid timestamp' }
  }
  return { ok: true, iso: d.toISOString() }
}

export function isoToUnixSeconds(iso: string): SecResult {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return { ok: false, error: 'Invalid date/time' }
  return { ok: true, seconds: Math.floor(ms / 1000) }
}
