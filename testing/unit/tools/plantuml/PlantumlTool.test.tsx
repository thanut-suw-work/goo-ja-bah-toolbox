import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { ThemeProvider } from '@/app/ThemeProvider'
import { ThemeToggle } from '@/app/ThemeToggle'
import { PlantumlTool } from '@/tools/plantuml/PlantumlTool'
import { renderBlock } from '@/tools/plantuml/render'
import { svgToRaster } from '@/tools/shared/svgToRaster'

function renderTool(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>)
}

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
    localStorage.clear()
    vi.mocked(renderBlock).mockReset()
    vi.mocked(svgToRaster).mockReset()
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:plantuml-test'),
      revokeObjectURL: vi.fn(),
    })
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute('open')
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('disables Visualize when the source is empty or whitespace', async () => {
    const user = userEvent.setup()
    renderTool(<PlantumlTool />)
    const button = screen.getByRole('button', { name: 'Visualize' })
    expect(button).toBeDisabled()
    await user.type(screen.getByLabelText('PlantUML source'), '   ')
    expect(screen.getByRole('button', { name: 'Visualize' })).toBeDisabled()
  })

  it('shows include error copy without calling the engine', async () => {
    const user = userEvent.setup()
    renderTool(<PlantumlTool />)
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
    renderTool(<PlantumlTool />)
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
    renderTool(<PlantumlTool />)
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

  it('opens a lightbox from View and closes it', async () => {
    vi.mocked(renderBlock).mockResolvedValue({
      ok: true,
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><title>drawn</title></svg>',
    })
    const user = userEvent.setup()
    renderTool(<PlantumlTool />)
    await user.type(
      screen.getByLabelText('PlantUML source'),
      '@startuml{Enter}A -> B{Enter}@enduml',
    )
    await user.click(screen.getByRole('button', { name: 'Visualize' }))
    await user.click(await screen.findByRole('button', { name: 'View' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveTextContent('Diagram 1')
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the lightbox from the preview and leaves PNG download unzoomed', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
    vi.mocked(renderBlock).mockResolvedValue({ ok: true, svg })
    vi.mocked(svgToRaster).mockResolvedValue(
      new Blob(['png'], { type: 'image/png' }),
    )
    const user = userEvent.setup()
    renderTool(<PlantumlTool />)
    await user.type(
      screen.getByLabelText('PlantUML source'),
      '@startuml{Enter}A -> B{Enter}@enduml',
    )
    await user.click(screen.getByRole('button', { name: 'Visualize' }))
    await user.click(await screen.findByRole('button', { name: 'View diagram 1' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Download PNG' }))
    expect(svgToRaster).toHaveBeenCalledWith(svg, { format: 'png', scale: 1 })
  })

  it('re-renders existing diagrams when theme cycles without a Visualize click', async () => {
    vi.mocked(renderBlock).mockResolvedValue({
      ok: true,
      svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    })
    const user = userEvent.setup()
    render(
      <ThemeProvider>
        <ThemeToggle />
        <PlantumlTool />
      </ThemeProvider>,
    )
    await user.type(
      screen.getByLabelText('PlantUML source'),
      '@startuml{Enter}A -> B{Enter}@enduml',
    )
    await user.click(screen.getByRole('button', { name: 'Visualize' }))
    await screen.findByRole('button', { name: 'Download SVG' })
    const callsAfterVisualize = vi.mocked(renderBlock).mock.calls.length
    await user.click(screen.getByRole('button', { name: 'Theme: Dark' }))
    await vi.waitFor(() => {
      expect(vi.mocked(renderBlock).mock.calls.length).toBeGreaterThan(
        callsAfterVisualize,
      )
    })
    const last = vi.mocked(renderBlock).mock.calls.at(-1)
    expect(last?.[2]).toBe(false)
  })
})
