import { Link, Outlet, useLocation } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { ThemeToggle } from './ThemeToggle'

export function AppShell() {
  const { pathname } = useLocation()
  const onToolPage = pathname.startsWith('/tools/')

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__header-inner">
          <Link to="/" className="brand">
            <svg
              className="brand__mark"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <polyline
                points="4 17 10 11 4 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="12"
                y1="19"
                x2="20"
                y2="19"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="brand__word">GJB Toolbox</span>
          </Link>
          <div className="app-shell__actions">
            {onToolPage ? (
              <Link to="/" className="shell-back">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M10 3.5L5 8l5 4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                back
              </Link>
            ) : null}
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="app-shell__main">
        <Outlet />
      </main>
      <Toaster position="bottom-right" />
    </div>
  )
}
