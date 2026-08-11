import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './AppShell'
import { HomePage } from './HomePage'
import { ToolPage } from './ToolPage'
import { NotFoundPage } from './NotFoundPage'
import { routerBasename } from './routerBasename'
import { ThemeProvider } from './ThemeProvider'

export function App() {
  return (
    <BrowserRouter basename={routerBasename(import.meta.env.BASE_URL)}>
      <ThemeProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="tools/:id" element={<ToolPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </ThemeProvider>
    </BrowserRouter>
  )
}
