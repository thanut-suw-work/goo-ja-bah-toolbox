import { useTheme } from './ThemeProvider'
import type { ThemePreference } from './theme'

const LABELS: Record<ThemePreference, string> = {
  dark: 'Theme: Dark',
  light: 'Theme: Light',
  system: 'Theme: System',
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 3v1.5M12 19.5V21M4.5 12H3M21 12h-1.5M6.2 6.2l1.1 1.1M16.7 16.7l1.1 1.1M6.2 17.8l1.1-1.1M16.7 7.3l1.1-1.1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MonitorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="4"
        width="18"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M8 20h8M12 16v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ThemeToggle() {
  const { preference, cycle } = useTheme()
  const label = LABELS[preference]
  return (
    <>
      <button
        type="button"
        className="theme-toggle"
        onClick={cycle}
        aria-label={label}
        title={label}
      >
        {preference === 'dark' ? <MoonIcon /> : null}
        {preference === 'light' ? <SunIcon /> : null}
        {preference === 'system' ? <MonitorIcon /> : null}
      </button>
      <span className="visually-hidden" aria-live="polite">
        {label}
      </span>
    </>
  )
}
