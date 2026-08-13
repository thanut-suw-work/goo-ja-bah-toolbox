export type ColorTriple = { fill: string; stroke: string; label: string }

export const PALETTES: Record<'dark' | 'default', ColorTriple[]> = {
  dark: [
    { fill: '#2f5d50', stroke: '#7aa894', label: '#e6edf3' },
    { fill: '#35536e', stroke: '#7a9bb8', label: '#e6edf3' },
    { fill: '#6b5344', stroke: '#c4a890', label: '#e6edf3' },
    { fill: '#3d5c5c', stroke: '#7aabab', label: '#e6edf3' },
    { fill: '#5c4a32', stroke: '#c4a878', label: '#e6edf3' },
    { fill: '#4a5a3c', stroke: '#9bb07a', label: '#e6edf3' },
    { fill: '#5a4040', stroke: '#c49090', label: '#e6edf3' },
    { fill: '#3c4a5c', stroke: '#7a90a8', label: '#e6edf3' },
  ],
  default: [
    { fill: '#c5d9ce', stroke: '#2f5d50', label: '#14171d' },
    { fill: '#c5d0dc', stroke: '#35536e', label: '#14171d' },
    { fill: '#e2d4c4', stroke: '#6b5344', label: '#14171d' },
    { fill: '#c5d6d6', stroke: '#3d5c5c', label: '#14171d' },
    { fill: '#ddd4c4', stroke: '#5c4a32', label: '#14171d' },
    { fill: '#d4dcc5', stroke: '#4a5a3c', label: '#14171d' },
    { fill: '#e0cccc', stroke: '#5a4040', label: '#14171d' },
    { fill: '#d0d4dc', stroke: '#3c4a5c', label: '#14171d' },
  ],
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = out[i]!
    out[i] = out[j]!
    out[j] = tmp
  }
  return out
}

export function takeColor(
  colors: ColorTriple[],
  state: { cursor: number },
  prevFill: string | null,
): ColorTriple {
  let idx = state.cursor % colors.length
  if (prevFill && colors[idx]!.fill === prevFill && colors.length > 1) {
    idx = (idx + 1) % colors.length
    state.cursor += 1
  }
  state.cursor += 1
  return colors[idx]!
}
