import { lazy } from 'react'
import type { ToolDefinition, ToolGroup, ToolId } from './types'

export const toolGroups: ToolGroup[] = [
  { id: 'text', label: 'Text' },
  { id: 'ids-time', label: 'IDs & time' },
  { id: 'files', label: 'Files' },
  { id: 'diagrams', label: 'Diagrams' },
]

export const tools: ToolDefinition[] = [
  {
    id: 'json-formatter',
    title: 'JSON formatter',
    description: 'Pretty-print or minify JSON in your browser.',
    groupId: 'text',
    component: lazy(() => import('./json-formatter/JsonFormatterTool')),
  },
  {
    id: 'base64',
    title: 'Base64',
    description: 'Encode or decode UTF-8 text as Base64 in your browser.',
    groupId: 'text',
    component: lazy(() => import('./base64/Base64Tool')),
  },
  {
    id: 'utf-encoding',
    title: 'UTF encoding',
    description:
      'Convert text to and from UTF-8, UTF-16LE, UTF-32LE hex bytes, or Unicode code points.',
    groupId: 'text',
    component: lazy(() => import('./utf-encoding/UtfEncodingTool')),
  },
  {
    id: 'uuid',
    title: 'UUID',
    description: 'Generate random UUID v4 identifiers in your browser.',
    groupId: 'ids-time',
    component: lazy(() => import('./uuid/UuidTool')),
  },
  {
    id: 'hash-sha256',
    title: 'SHA-256 hash',
    description: 'Compute SHA-256 hex digests in your browser.',
    groupId: 'ids-time',
    component: lazy(() => import('./hash-sha256/HashSha256Tool')),
  },
  {
    id: 'unix-timestamp',
    title: 'Unix timestamp',
    description: 'Convert Unix seconds and ISO UTC date/time in your browser.',
    groupId: 'ids-time',
    component: lazy(() => import('./unix-timestamp/UnixTimestampTool')),
  },
  {
    id: 'text-case',
    title: 'Text case',
    description: 'Convert text between lower, upper, title, camel, and snake case.',
    groupId: 'text',
    component: lazy(() => import('./text-case/TextCaseTool')),
  },
  {
    id: 'pdf-to-image',
    title: 'PDF to image',
    description: 'Convert a PDF page range to PNG or JPG in your browser.',
    groupId: 'files',
    component: lazy(() => import('./pdf-to-image/PdfToImageTool')),
  },
  {
    id: 'plantuml',
    title: 'PlantUML',
    description:
      'View .puml diagrams in the browser. Nothing is uploaded.',
    groupId: 'diagrams',
    component: lazy(() => import('./plantuml/PlantumlTool')),
  },
  {
    id: 'svg-to-image',
    title: 'SVG to image',
    description: 'Convert SVG to PNG or JPEG in your browser.',
    groupId: 'files',
    component: lazy(() => import('./svg-to-image/SvgToImageTool')),
  },
  {
    id: 'mermaid',
    title: 'Mermaid',
    description:
      'View .mmd and Mermaid fences in the browser. Nothing is uploaded.',
    groupId: 'diagrams',
    component: lazy(() => import('./mermaid/MermaidTool')),
  },
]

export function getToolById(id: string): ToolDefinition | undefined {
  return tools.find((t) => t.id === id)
}

export function toolsByGroup(): {
  group: ToolGroup
  tools: ToolDefinition[]
}[] {
  return toolGroups.map((group) => ({
    group,
    tools: tools.filter((t) => t.groupId === group.id),
  }))
}

export function requireToolIds(expected: ToolId[]): void {
  const have = new Set(tools.map((t) => t.id))
  for (const id of expected) {
    if (!have.has(id)) throw new Error(`missing tool: ${id}`)
  }
}
