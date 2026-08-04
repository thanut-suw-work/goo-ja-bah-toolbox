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
        GJB Toolbox
      </Link>
      <header className="tool-page__header">
        <h1 className="tool-page__title">{title}</h1>
        <p className="tool-page__description">{description}</p>
      </header>
      <div className="tool-panel">{children}</div>
    </section>
  )
}
