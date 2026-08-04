import { Link, Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__header-inner">
          <Link to="/" className="brand">
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
