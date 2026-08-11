export type PanZoom = {
  x: number
  y: number
  scale: number
}

export const MIN_SCALE = 0.25
export const MAX_SCALE = 4
export const IDENTITY: PanZoom = { x: 0, y: 0, scale: 1 }

const ZOOM_SENSITIVITY = 0.002

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale))
}

export function applyPan(state: PanZoom, dx: number, dy: number): PanZoom {
  return { x: state.x + dx, y: state.y + dy, scale: state.scale }
}

export function applyWheelZoom(
  state: PanZoom,
  input: { deltaY: number; pointerX: number; pointerY: number },
): PanZoom {
  const nextScale = clampScale(
    state.scale * Math.exp(-input.deltaY * ZOOM_SENSITIVITY),
  )
  if (nextScale === state.scale) {
    return state
  }
  const worldX = (input.pointerX - state.x) / state.scale
  const worldY = (input.pointerY - state.y) / state.scale
  return {
    x: input.pointerX - worldX * nextScale,
    y: input.pointerY - worldY * nextScale,
    scale: nextScale,
  }
}

export function panZoomStyle(state: PanZoom): {
  transform: string
  transformOrigin: '0 0'
} {
  return {
    transform: `translate(${state.x}px, ${state.y}px) scale(${state.scale})`,
    transformOrigin: '0 0',
  }
}
