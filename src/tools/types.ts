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

export type ToolGroupId = 'text' | 'ids-time' | 'files' | 'diagrams'

export type ToolGroup = {
  id: ToolGroupId
  label: string
}

export type ToolDefinition = {
  id: ToolId
  title: string
  description: string
  groupId: ToolGroupId
  component: LazyExoticComponent<ComponentType>
}
