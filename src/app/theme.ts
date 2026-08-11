export const THEME_STORAGE_KEY = 'gjb-theme'

export type ThemePreference = 'dark' | 'light' | 'system'
export type ResolvedTheme = 'dark' | 'light'

const PREFS = new Set<ThemePreference>(['dark', 'light', 'system'])

export function parseThemePreference(raw: string | null): ThemePreference {
  if (raw && PREFS.has(raw as ThemePreference)) return raw as ThemePreference
  return 'dark'
}

export function resolveTheme(
  preference: ThemePreference,
  prefersLight: boolean,
): ResolvedTheme {
  if (preference === 'system') return prefersLight ? 'light' : 'dark'
  return preference
}

export function cycleTheme(current: ThemePreference): ThemePreference {
  if (current === 'dark') return 'light'
  if (current === 'light') return 'system'
  return 'dark'
}

export function readStoredPreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'dark'
  }
}

export function writeStoredPreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    /* private mode / quota — memory still wins */
  }
}

export function prefersLightScheme(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches
  } catch {
    return false
  }
}

export function applyResolvedTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement
  root.setAttribute('data-theme', resolved)
  root.style.colorScheme = resolved
  root.style.backgroundColor = resolved === 'light' ? '#f7f5ed' : '#0d1117'
}

export function mermaidTheme(resolved: ResolvedTheme): 'dark' | 'default' {
  return resolved === 'dark' ? 'dark' : 'default'
}
