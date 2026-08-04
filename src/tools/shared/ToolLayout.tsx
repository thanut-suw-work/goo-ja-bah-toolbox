import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

type Props = {
  title: string
  description: string
  icon?: LucideIcon
  children: ReactNode
}

export function ToolLayout({ title, description, icon: Icon, children }: Props) {
  return (
    <section className="space-y-6">
      <Link
        to="/"
        className="tool-page__back inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
      <header className="space-y-2">
        <h1 className="flex items-center gap-3 font-display text-3xl font-bold tracking-tight text-foreground">
          {Icon ? <Icon className="h-8 w-8 text-primary" aria-hidden="true" /> : null}
          {title}
        </h1>
        <p className="text-muted-foreground">{description}</p>
      </header>
      {children}
    </section>
  )
}
