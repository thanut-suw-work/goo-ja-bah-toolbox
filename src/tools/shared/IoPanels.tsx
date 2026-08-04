import type { ReactNode } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type PanelProps = {
  title: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function IoPanel({ title, actions, children, className }: PanelProps) {
  return (
    <Card data-io-panel className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        {actions ? <div className="flex gap-2">{actions}</div> : null}
      </CardHeader>
      <CardContent className="border-t p-0">{children}</CardContent>
    </Card>
  )
}

export function IoGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">{children}</div>
  )
}

export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
      {children}
    </div>
  )
}
