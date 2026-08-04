import type { ReactNode } from 'react'
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
