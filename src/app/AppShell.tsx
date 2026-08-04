import { Link, Outlet } from 'react-router-dom'

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
    </div>
  )
}
