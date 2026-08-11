import '@testing-library/jest-dom/vitest'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@/app/ThemeProvider'
import { ThemeToggle } from '@/app/ThemeToggle'
import { AppShell } from '@/app/AppShell'
import { THEME_STORAGE_KEY } from '@/app/theme'

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  )
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults to Theme: Dark and data-theme=dark without writing storage', () => {
    renderToggle()
    expect(
      screen.getByRole('button', { name: 'Theme: Dark' }),
    ).toBeInTheDocument()
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  it('cycles Dark → Light → System → Dark and persists', async () => {
    const user = userEvent.setup()
    renderToggle()
    await user.click(screen.getByRole('button', { name: 'Theme: Dark' }))
    expect(
      screen.getByRole('button', { name: 'Theme: Light' }),
    ).toBeInTheDocument()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')

    await user.click(screen.getByRole('button', { name: 'Theme: Light' }))
    expect(
      screen.getByRole('button', { name: 'Theme: System' }),
    ).toBeInTheDocument()
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system')

    await user.click(screen.getByRole('button', { name: 'Theme: System' }))
    expect(
      screen.getByRole('button', { name: 'Theme: Dark' }),
    ).toBeInTheDocument()
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('system preference follows matchMedia light', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'system')
    vi.stubGlobal(
      'matchMedia',
      (query: string) =>
        ({
          matches: query.includes('prefers-color-scheme: light'),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
          addListener: () => {},
          removeListener: () => {},
          dispatchEvent: () => false,
          onchange: null,
        }) as MediaQueryList,
    )
    renderToggle()
    expect(
      screen.getByRole('button', { name: 'Theme: System' }),
    ).toBeInTheDocument()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })
})

describe('AppShell toggle placement', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the theme button in the header', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('button', { name: 'Theme: Dark' }),
    ).toBeInTheDocument()
  })
})
