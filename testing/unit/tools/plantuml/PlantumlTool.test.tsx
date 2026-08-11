import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlantumlTool } from '@/tools/plantuml/PlantumlTool'
import { renderBlock } from '@/tools/plantuml/render'
import { svgToRaster } from '@/tools/shared/svgToRaster'

vi.mock('@/tools/plantuml/render', () => ({
  renderBlock: vi.fn(async () => {
    throw new Error('engine must not boot in unit tests')
  }),
}))

vi.mock('@/tools/shared/svgToRaster', () => ({
  svgToRaster: vi.fn(),
}))

describe('PlantumlTool', () => {
  beforeEach(() => {
    vi.mocked(renderBlock).mockReset()
    vi.mocked(svgToRaster).mockReset()
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:plantuml-test'),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('disables Visualize when the source is empty or whitespace', async () => {
    const user = userEvent.setup()
    render(<PlantumlTool />)
    const button = screen.getByRole('button', { name: 'Visualize' })
    expect(button).toBeDisabled()
    await user.type(screen.getByLabelText('PlantUML source'), '   ')
    expect(screen.getByRole('button', { name: 'Visualize' })).toBeDisabled()
  })

  it('shows include error copy without calling the engine', async () => {
    const user = userEvent.setup()
    render(<PlantumlTool />)
    await user.type(
      screen.getByLabelText('PlantUML source'),
      '@startuml{Enter}!include common.puml{Enter}@enduml',
    )
    await user.click(screen.getByRole('button', { name: 'Visualize' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(
      'Line 2: !include common.puml — this tool renders one file. Paste included contents into this diagram or remove the include.',
    )
    expect(renderBlock).not.toHaveBeenCalled()
  })

  it('downloads PNG via svgToRaster png scale 1', async () => {
    vi.mocked(renderBlock).mockResolvedValue({
      ok: true,
      svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    })
    vi.mocked(svgToRaster).mockResolvedValue(
      new Blob(['png'], { type: 'image/png' }),
    )
    const user = userEvent.setup()
    render(<PlantumlTool />)
    await user.type(
      screen.getByLabelText('PlantUML source'),
      '@startuml{Enter}Alice -> Bob{Enter}@enduml',
    )
    await user.click(screen.getByRole('button', { name: 'Visualize' }))
    await screen.findByRole('button', { name: 'Download PNG' })
    await user.click(screen.getByRole('button', { name: 'Download PNG' }))
    expect(svgToRaster).toHaveBeenCalledWith(
      '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
      { format: 'png', scale: 1 },
    )
    expect(svgToRaster).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ format: 'jpeg' }),
    )
  })

  it('keeps SVG and shows Could not create PNG when raster fails', async () => {
    vi.mocked(renderBlock).mockResolvedValue({
      ok: true,
      svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    })
    vi.mocked(svgToRaster).mockRejectedValue(new Error('remote URL not loaded'))
    const user = userEvent.setup()
    render(<PlantumlTool />)
    await user.type(
      screen.getByLabelText('PlantUML source'),
      '@startuml{Enter}A -> B{Enter}@enduml',
    )
    await user.click(screen.getByRole('button', { name: 'Visualize' }))
    await user.click(await screen.findByRole('button', { name: 'Download PNG' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(
      'Could not create PNG: remote URL not loaded',
    )
    expect(
      screen.getByRole('button', { name: 'Download SVG' }),
    ).toBeEnabled()
  })
})
