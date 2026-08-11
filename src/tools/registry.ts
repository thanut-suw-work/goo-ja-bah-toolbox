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
  {
    id: 'hash-sha256',
    title: 'SHA-256 hash',
    description: 'Compute SHA-256 hex digests in your browser.',
    component: lazy(() => import('./hash-sha256/HashSha256Tool')),
  },
  {
    id: 'unix-timestamp',
    title: 'Unix timestamp',
    description: 'Convert Unix seconds and ISO UTC date/time in your browser.',
    component: lazy(() => import('./unix-timestamp/UnixTimestampTool')),
  },
  {
    id: 'text-case',
    title: 'Text case',
    description: 'Convert text between lower, upper, title, camel, and snake case.',
    component: lazy(() => import('./text-case/TextCaseTool')),
  },
  {
    id: 'pdf-to-image',
    title: 'PDF to image',
    description: 'Convert a PDF page range to PNG or JPG in your browser.',
    component: lazy(() => import('./pdf-to-image/PdfToImageTool')),
  },
  {
    id: 'utf-encoding',
    title: 'UTF encoding',
    description:
      'Convert text to and from UTF-8, UTF-16LE, UTF-32LE hex bytes, or Unicode code points.',
    component: lazy(() => import('./utf-encoding/UtfEncodingTool')),
  },
  {
    id: 'plantuml',
    title: 'PlantUML',
    description:
      'View .puml diagrams in the browser. Nothing is uploaded.',
    component: lazy(() => import('./plantuml/PlantumlTool')),
  },
  {
    id: 'svg-to-image',
    title: 'SVG to image',
    description: 'Convert SVG to PNG or JPEG in your browser.',
    component: lazy(() => import('./svg-to-image/SvgToImageTool')),
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
