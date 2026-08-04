export type RangeResult =
  | { ok: true; from: number; to: number }
  | { ok: false; error: string }

export function normalizePageRange(
  from: number,
  to: number,
  pageCount: number,
): RangeResult {
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    return { ok: false, error: 'Pages must be integers' }
  }
  if (from < 1 || to < 1 || from > pageCount || to > pageCount) {
    return { ok: false, error: `Pages must be between 1 and ${pageCount}` }
  }
  if (from > to) {
    return { ok: false, error: 'From page must be ≤ to page' }
  }
  return { ok: true, from, to }
}
