import '@testing-library/jest-dom/vitest'
import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SvgToImageTool } from '@/tools/svg-to-image/SvgToImageTool'

describe('SvgToImageTool', () => {
  it('disables Convert when the source is empty or whitespace', async () => {
    const user = userEvent.setup()
    render(<SvgToImageTool />)
    const convert = screen.getByRole('button', { name: 'Convert' })
    expect(convert).toBeDisabled()
    await user.type(screen.getByLabelText('SVG source'), '   ')
    expect(screen.getByRole('button', { name: 'Convert' })).toBeDisabled()
  })

  it('disables JPEG quality when format is PNG and enables it for JPEG', async () => {
    const user = userEvent.setup()
    render(<SvgToImageTool />)
    const quality = screen.getByLabelText('JPEG quality')
    expect(quality).toBeDisabled()
    await user.selectOptions(screen.getByLabelText('Format'), 'jpeg')
    expect(screen.getByLabelText('JPEG quality')).not.toBeDisabled()
  })

  it('shows Not an SVG document on the preview card after Convert', async () => {
    const user = userEvent.setup()
    render(<SvgToImageTool />)
    await user.type(screen.getByLabelText('SVG source'), '<html></html>')
    await user.click(screen.getByRole('button', { name: 'Convert' }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Not an SVG document')
    })
    expect(screen.queryByAltText('Raster preview')).toBeNull()
  })
})
