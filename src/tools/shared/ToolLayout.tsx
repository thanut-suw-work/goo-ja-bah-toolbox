import type { ReactNode } from 'react'

type Props = {
  title: string
  description: string
  children: ReactNode
}

export function ToolLayout({ title, description, children }: Props) {
  return (
    <section>
      <header>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <div>{children}</div>
    </section>
  )
}
