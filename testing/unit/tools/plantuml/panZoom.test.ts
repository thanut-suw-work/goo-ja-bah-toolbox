import { describe, it, expect } from 'vitest'
import {
  IDENTITY,
  MAX_SCALE,
  MIN_SCALE,
  applyPan,
  applyWheelZoom,
  clampScale,
  panZoomStyle,
} from '@/tools/plantuml/panZoom'

describe('clampScale', () => {
  it('clamps below the minimum', () => {
    expect(clampScale(0.01)).toBe(MIN_SCALE)
  })

  it('clamps above the maximum', () => {
    expect(clampScale(99)).toBe(MAX_SCALE)
  })

  it('passes through a value in range', () => {
    expect(clampScale(1.5)).toBe(1.5)
  })
})

describe('applyPan', () => {
  it('adds delta to x and y without changing scale', () => {
    expect(applyPan({ x: 10, y: 20, scale: 2 }, 5, -3)).toEqual({
      x: 15,
      y: 17,
      scale: 2,
    })
  })
})

describe('applyWheelZoom', () => {
  it('zooms in toward the pointer when deltaY is negative', () => {
    const start = IDENTITY
    const next = applyWheelZoom(start, {
      deltaY: -100,
      pointerX: 100,
      pointerY: 50,
    })
    expect(next.scale).toBeGreaterThan(start.scale)
    expect(next.scale).toBeLessThanOrEqual(MAX_SCALE)
    // diagram point under the cursor stays under the cursor
    const beforeX = (100 - start.x) / start.scale
    const afterX = (100 - next.x) / next.scale
    expect(afterX).toBeCloseTo(beforeX)
    const beforeY = (50 - start.y) / start.scale
    const afterY = (50 - next.y) / next.scale
    expect(afterY).toBeCloseTo(beforeY)
  })

  it('zooms out when deltaY is positive', () => {
    const start = { x: 0, y: 0, scale: 2 }
    const next = applyWheelZoom(start, {
      deltaY: 100,
      pointerX: 0,
      pointerY: 0,
    })
    expect(next.scale).toBeLessThan(start.scale)
    expect(next.scale).toBeGreaterThanOrEqual(MIN_SCALE)
  })

  it('does not move past the scale clamp', () => {
    const atMax = applyWheelZoom(
      { x: 0, y: 0, scale: MAX_SCALE },
      { deltaY: -100, pointerX: 10, pointerY: 10 },
    )
    expect(atMax.scale).toBe(MAX_SCALE)
    expect(atMax.x).toBe(0)
    expect(atMax.y).toBe(0)
  })
})

describe('panZoomStyle', () => {
  it('emits a transform-origin 0 0 translate+scale', () => {
    expect(panZoomStyle({ x: 12, y: -4, scale: 1.5 })).toEqual({
      transform: 'translate(12px, -4px) scale(1.5)',
      transformOrigin: '0 0',
    })
  })
})
