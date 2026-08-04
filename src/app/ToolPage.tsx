import { Suspense } from 'react'
import { useParams } from 'react-router-dom'
import { getToolById } from '@/tools/registry'
import { ToolLayout } from '@/tools/shared/ToolLayout'
import { NotFoundPage } from './NotFoundPage'

export function ToolPage() {
  const { id } = useParams()
  const tool = id ? getToolById(id) : undefined
  if (!tool) return <NotFoundPage />

  const Comp = tool.component
  return (
    <ToolLayout title={tool.title} description={tool.description}>
      <Suspense fallback={<p>Loading…</p>}>
        <Comp />
      </Suspense>
    </ToolLayout>
  )
}
