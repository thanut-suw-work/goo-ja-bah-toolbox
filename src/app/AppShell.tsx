import { Link, Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'

export function AppShell() {
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
        </div>
      </header>
      <main className="app-shell__main">
        <Outlet />
      </main>
      <Toaster position="bottom-right" />
    </div>
  )
}
