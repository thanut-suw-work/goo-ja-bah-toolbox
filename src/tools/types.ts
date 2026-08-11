import type { ComponentType, LazyExoticComponent } from 'react'

export type ToolId =
  | 'json-formatter'
  | 'base64'
  | 'uuid'
  | 'hash-sha256'
  | 'unix-timestamp'
  | 'text-case'
  | 'pdf-to-image'
  | 'utf-encoding'
  | 'plantuml'
  | 'svg-to-image'
  | 'mermaid'

export type ToolDefinition = {
  id: ToolId
  title: string
  description: string
  component: LazyExoticComponent<ComponentType>
}
