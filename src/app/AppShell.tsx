import { Link, Outlet } from 'react-router-dom'

export function AppShell() {
  return (
    <div>
      <header>
        <Link to="/">
          <strong>GJB Toolbox</strong>
        </Link>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
