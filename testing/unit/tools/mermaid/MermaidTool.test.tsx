import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { ThemeProvider } from '@/app/ThemeProvider'
import { ThemeToggle } from '@/app/ThemeToggle'
import { MermaidTool } from '@/tools/mermaid/MermaidTool'
import { renderBlock } from '@/tools/mermaid/render'
import { svgToRaster } from '@/tools/shared/svgToRaster'
import { colorizePreview } from '@/tools/mermaid/colorizeSvg'

function renderTool(ui: ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>)
}

vi.mock('@/tools/mermaid/render', () => ({
  renderBlock: vi.fn(async () => {
    throw new Error('engine must not boot in unit tests')
  }),
}))

vi.mock('@/tools/shared/svgToRaster', () => ({
  svgToRaster: vi.fn(),
}))

vi.mock('@/tools/mermaid/colorizeSvg', () => ({
  colorizePreview: vi.fn((svg: string) => ({ previewSvg: svg, colored: false })),
}))

describe('MermaidTool', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(renderBlock).mockReset()
    vi.mocked(svgToRaster).mockReset()
    vi.mocked(colorizePreview).mockReset()
    vi.mocked(colorizePreview).mockImplementation((svg: string) => ({
      previewSvg: svg,
      colored: false,
    }))
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mermaid-test'),
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
    renderTool(<MermaidTool />)
    expect(screen.getByRole('button', { name: 'Visualize' })).toBeDisabled()
    await user.type(screen.getByLabelText('Mermaid source'), '   ')
    expect(screen.getByRole('button', { name: 'Visualize' })).toBeDisabled()
  })

  it('accepts mmd and markdown files', () => {
    renderTool(<MermaidTool />)
    const input = document.getElementById('mermaid-file')
    expect(input).toHaveAttribute(
      'accept',
      '.mmd,.mermaid,.md,.markdown,.txt',
    )
  })

  it('shows a tip for the accepted .mmd and fence pattern', () => {
    renderTool(<MermaidTool />)
    expect(
      screen.getByText(/each fence is one diagram/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Raw .mmd')).toBeInTheDocument()
    expect(screen.getByText('Markdown fences')).toBeInTheDocument()
    expect(screen.getByLabelText('Example raw .mmd').textContent).toBe(
      'flowchart TD\n  A-->B',
    )
    expect(
      screen.getByLabelText('Example Markdown fences').textContent,
    ).toBe('```mermaid\nflowchart TD\n  A-->B\n```')
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
    renderTool(<MermaidTool />)
    await user.type(
      screen.getByLabelText('Mermaid source'),
      'flowchart TD{Enter}  A-->B',
    )
    await user.click(screen.getByRole('button', { name: 'Visualize' }))
    await screen.findByRole('button', { name: 'Download PNG' })
    await user.click(screen.getByRole('button', { name: 'Download PNG' }))
    expect(svgToRaster).toHaveBeenCalledWith(
      '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
      { format: 'png', scale: 1 },
    )
  })

  it('keeps SVG and shows Could not create PNG when raster fails', async () => {
    vi.mocked(renderBlock).mockResolvedValue({
      ok: true,
      svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    })
    vi.mocked(svgToRaster).mockRejectedValue(new Error('remote URL not loaded'))
    const user = userEvent.setup()
    renderTool(<MermaidTool />)
    await user.type(screen.getByLabelText('Mermaid source'), 'flowchart TD')
    await user.click(screen.getByRole('button', { name: 'Visualize' }))
    await user.click(await screen.findByRole('button', { name: 'Download PNG' }))
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not create PNG: remote URL not loaded',
    )
    expect(screen.getByRole('button', { name: 'Download SVG' })).toBeEnabled()
  })

  it('opens a lightbox from View and closes it', async () => {
    vi.mocked(renderBlock).mockResolvedValue({
      ok: true,
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><title>drawn</title></svg>',
    })
    const user = userEvent.setup()
    renderTool(<MermaidTool />)
    await user.type(screen.getByLabelText('Mermaid source'), 'flowchart TD')
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
    renderTool(<MermaidTool />)
    await user.type(screen.getByLabelText('Mermaid source'), 'flowchart TD')
    await user.click(screen.getByRole('button', { name: 'Visualize' }))
    await user.click(
      await screen.findByRole('button', { name: 'View diagram 1' }),
    )
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
        <MermaidTool />
      </ThemeProvider>,
    )
    await user.type(screen.getByLabelText('Mermaid source'), 'flowchart TD')
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
    expect(last?.[2]).toBe('default')
  })

  it('hides Download with color when colorize reports colored false', async () => {
    vi.mocked(renderBlock).mockResolvedValue({
      ok: true,
      svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    })
    const user = userEvent.setup()
    renderTool(<MermaidTool />)
    await user.type(screen.getByLabelText('Mermaid source'), 'pie')
    await user.click(screen.getByRole('button', { name: 'Visualize' }))
    await screen.findByRole('button', { name: 'Download SVG' })
    expect(
      screen.queryByRole('checkbox', { name: 'Download with color?' }),
    ).not.toBeInTheDocument()
  })

  it('defaults the color download checkbox off and downloads raw svg', async () => {
    vi.mocked(colorizePreview).mockReturnValue({
      previewSvg: '<svg xmlns="http://www.w3.org/2000/svg"><g id="c"/></svg>',
      colored: true,
    })
    const raw = '<svg xmlns="http://www.w3.org/2000/svg"><g id="raw"/></svg>'
    vi.mocked(renderBlock).mockResolvedValue({ ok: true, svg: raw })
    vi.mocked(svgToRaster).mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
    const user = userEvent.setup()
    renderTool(<MermaidTool />)
    await user.type(screen.getByLabelText('Mermaid source'), 'flowchart TD')
    await user.click(screen.getByRole('button', { name: 'Visualize' }))
    const box = await screen.findByRole('checkbox', { name: 'Download with color?' })
    expect(box).not.toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Download PNG' }))
    expect(svgToRaster).toHaveBeenCalledWith(raw, { format: 'png', scale: 1 })
  })

  it('downloads the preview clone when Download with color is on', async () => {
    const preview = '<svg xmlns="http://www.w3.org/2000/svg"><g id="c"/></svg>'
    vi.mocked(colorizePreview).mockReturnValue({ previewSvg: preview, colored: true })
    vi.mocked(renderBlock).mockResolvedValue({
      ok: true,
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><g id="raw"/></svg>',
    })
    vi.mocked(svgToRaster).mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
    const user = userEvent.setup()
    renderTool(<MermaidTool />)
    await user.type(screen.getByLabelText('Mermaid source'), 'flowchart TD')
    await user.click(screen.getByRole('button', { name: 'Visualize' }))
    await user.click(await screen.findByRole('checkbox', { name: 'Download with color?' }))
    await user.click(screen.getByRole('button', { name: 'Download PNG' }))
    expect(svgToRaster).toHaveBeenCalledWith(preview, { format: 'png', scale: 1 })
  })

  it('puts the preview clone in the lightbox', async () => {
    vi.mocked(colorizePreview).mockReturnValue({
      previewSvg: '<svg xmlns="http://www.w3.org/2000/svg"><title>colored</title></svg>',
      colored: true,
    })
    vi.mocked(renderBlock).mockResolvedValue({
      ok: true,
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><title>raw</title></svg>',
    })
    const user = userEvent.setup()
    renderTool(<MermaidTool />)
    await user.type(screen.getByLabelText('Mermaid source'), 'flowchart TD')
    await user.click(screen.getByRole('button', { name: 'Visualize' }))
    await user.click(await screen.findByRole('button', { name: 'View' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('colored')
    expect(dialog).not.toHaveTextContent('raw')
  })
})
