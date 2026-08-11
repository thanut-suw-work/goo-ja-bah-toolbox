export const DEFAULT_STEM = 'image'

export function stemFromFilename(filename: string): string {
  const base = filename.replace(/^.*[/\\]/, '').trim()
  if (!base) return DEFAULT_STEM
  const cut = base.lastIndexOf('.')
  if (cut <= 0) return base
  const stem = base.slice(0, cut).trim()
  return stem || DEFAULT_STEM
}
