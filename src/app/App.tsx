import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './AppShell'
import { HomePage } from './HomePage'
import { ToolPage } from './ToolPage'
import { NotFoundPage } from './NotFoundPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="tools/:id" element={<ToolPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
