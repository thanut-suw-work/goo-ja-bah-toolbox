import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  applyResolvedTheme,
  cycleTheme,
  prefersLightScheme,
  readStoredPreference,
  resolveTheme,
  writeStoredPreference,
  type ResolvedTheme,
  type ThemePreference,
} from './theme'

type ThemeContextValue = {
  preference: ThemePreference
  resolved: ResolvedTheme
  cycle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(() =>
    readStoredPreference(),
  )
  const [prefersLight, setPrefersLight] = useState(prefersLightScheme)
  const resolved = resolveTheme(preference, prefersLight)

  useEffect(() => {
    applyResolvedTheme(resolved)
  }, [resolved])

  useEffect(() => {
    if (preference !== 'system') return
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => setPrefersLight(mq.matches)
    mq.addEventListener('change', onChange)
    onChange()
    return () => mq.removeEventListener('change', onChange)
  }, [preference])

  const cycle = useCallback(() => {
    setPreference((current) => {
      const next = cycleTheme(current)
      writeStoredPreference(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ preference, resolved, cycle }),
    [preference, resolved, cycle],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme requires ThemeProvider')
  return ctx
}
