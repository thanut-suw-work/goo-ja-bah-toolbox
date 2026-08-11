import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  THEME_STORAGE_KEY,
  parseThemePreference,
  resolveTheme,
  cycleTheme,
  readStoredPreference,
  writeStoredPreference,
  applyResolvedTheme,
} from '@/app/theme'

describe('parseThemePreference', () => {
  it('returns dark for null, empty, and garbage', () => {
    expect(parseThemePreference(null)).toBe('dark')
    expect(parseThemePreference('')).toBe('dark')
    expect(parseThemePreference('DARK')).toBe('dark')
    expect(parseThemePreference('yes')).toBe('dark')
  })

  it('accepts dark, light, and system', () => {
    expect(parseThemePreference('dark')).toBe('dark')
    expect(parseThemePreference('light')).toBe('light')
    expect(parseThemePreference('system')).toBe('system')
  })
})

describe('resolveTheme', () => {
  it('returns the preference when it is dark or light', () => {
    expect(resolveTheme('dark', true)).toBe('dark')
    expect(resolveTheme('light', false)).toBe('light')
  })

  it('follows prefersLight only for system', () => {
    expect(resolveTheme('system', true)).toBe('light')
    expect(resolveTheme('system', false)).toBe('dark')
  })
})

describe('cycleTheme', () => {
  it('goes dark → light → system → dark', () => {
    expect(cycleTheme('dark')).toBe('light')
    expect(cycleTheme('light')).toBe('system')
    expect(cycleTheme('system')).toBe('dark')
  })
})

describe('storage helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('readStoredPreference is dark when missing', () => {
    expect(readStoredPreference()).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })

  it('writeStoredPreference stores the enum', () => {
    writeStoredPreference('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(readStoredPreference()).toBe('light')
  })

  it('readStoredPreference returns dark when getItem throws', () => {
    const spy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(readStoredPreference()).toBe('dark')
    spy.mockRestore()
  })

  it('writeStoredPreference swallows setItem throws', () => {
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => writeStoredPreference('light')).not.toThrow()
    spy.mockRestore()
  })
})

describe('applyResolvedTheme', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.style.colorScheme = ''
    document.documentElement.style.backgroundColor = ''
  })

  it('sets data-theme, color-scheme, and background for dark and light', () => {
    applyResolvedTheme('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(document.documentElement.style.backgroundColor).toBe('rgb(13, 17, 23)')

    applyResolvedTheme('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(document.documentElement.style.colorScheme).toBe('light')
    expect(document.documentElement.style.backgroundColor).toBe(
      'rgb(247, 245, 237)',
    )
  })
})
