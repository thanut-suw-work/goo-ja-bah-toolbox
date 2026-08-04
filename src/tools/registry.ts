import { lazy } from 'react'
import type { ToolDefinition, ToolId } from './types'

export const tools: ToolDefinition[] = [
  {
    id: 'json-formatter',
    title: 'JSON formatter',
    description: 'Pretty-print or minify JSON in your browser.',
    component: lazy(() => import('./json-formatter/JsonFormatterTool')),
  },
]

export function getToolById(id: string): ToolDefinition | undefined {
  return tools.find((t) => t.id === id)
}

export function requireToolIds(expected: ToolId[]): void {
  const have = new Set(tools.map((t) => t.id))
  for (const id of expected) {
    if (!have.has(id)) throw new Error(`missing tool: ${id}`)
  }
}
