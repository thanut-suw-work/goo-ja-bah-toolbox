import { lazy } from 'react'
import type { ToolDefinition, ToolId } from './types'

export const tools: ToolDefinition[] = [
  {
    id: 'json-formatter',
    title: 'JSON formatter',
    description: 'Pretty-print or minify JSON in your browser.',
    component: lazy(() => import('./json-formatter/JsonFormatterTool')),
  },
  {
    id: 'base64',
    title: 'Base64',
    description: 'Encode or decode UTF-8 text as Base64 in your browser.',
    component: lazy(() => import('./base64/Base64Tool')),
  },
  {
    id: 'uuid',
    title: 'UUID',
    description: 'Generate random UUID v4 identifiers in your browser.',
    component: lazy(() => import('./uuid/UuidTool')),
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
