import type { ToolDefinition, ToolId } from './types'

export const tools: ToolDefinition[] = [
  // filled in later tasks — start with json-formatter only after Task 4
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
