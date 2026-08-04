import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  title: string
  description: string
  children: ReactNode
}

export function ToolLayout({ title, description, children }: Props) {
  return (
    <section>
      <Link to="/" className="tool-page__back">
        ← GJB Toolbox
      </Link>
      <header className="tool-page__header">
        <h1 className="tool-page__title">{title}</h1>
        <p className="tool-page__description">{description}</p>
      </header>
      <div className="tool-panel">{children}</div>
    </section>
  )
}
