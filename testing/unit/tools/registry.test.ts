import { describe, it, expect } from 'vitest'
import {
  tools,
  toolGroups,
  getToolById,
  toolsByGroup,
} from '@/tools/registry'
import type { ToolGroupId } from '@/tools/types'

const expectedIds = [
  'json-formatter',
  'base64',
  'uuid',
  'hash-sha256',
  'unix-timestamp',
  'text-case',
  'pdf-to-image',
  'utf-encoding',
  'plantuml',
  'svg-to-image',
  'mermaid',
] as const

const expectedGroups: { id: ToolGroupId; label: string; toolIds: string[] }[] =
  [
    {
      id: 'text',
      label: 'Text',
      toolIds: ['json-formatter', 'base64', 'utf-encoding', 'text-case'],
    },
    {
      id: 'ids-time',
      label: 'IDs & time',
      toolIds: ['uuid', 'hash-sha256', 'unix-timestamp'],
    },
    {
      id: 'files',
      label: 'Files',
      toolIds: ['pdf-to-image', 'svg-to-image'],
    },
    {
      id: 'diagrams',
      label: 'Diagrams',
      toolIds: ['plantuml', 'mermaid'],
    },
  ]

describe('registry', () => {
  it('exposes unique ids', () => {
    const ids = tools.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('getToolById returns undefined for unknown', () => {
    expect(getToolById('nope')).toBeUndefined()
  })

  it('exposes the expected tool ids', () => {
    expect(tools.map((t) => t.id).sort()).toEqual([...expectedIds].sort())
  })

  it('exposes the four groups in catalog order', () => {
    expect(toolGroups.map((g) => ({ id: g.id, label: g.label }))).toEqual(
      expectedGroups.map((g) => ({ id: g.id, label: g.label })),
    )
  })

  it('assigns every tool a catalog groupId', () => {
    const catalog = new Set(toolGroups.map((g) => g.id))
    for (const t of tools) {
      expect(catalog.has(t.groupId), `${t.id} groupId`).toBe(true)
    }
  })

  it('gives every catalog group at least one tool', () => {
    for (const g of toolGroups) {
      expect(
        tools.some((t) => t.groupId === g.id),
        `empty group ${g.id}`,
      ).toBe(true)
    }
  })

  it('toolsByGroup follows catalog order and registry order inside each group', () => {
    const grouped = toolsByGroup()
    expect(grouped.map((s) => s.group.id)).toEqual(
      expectedGroups.map((g) => g.id),
    )
    for (let i = 0; i < expectedGroups.length; i++) {
      expect(grouped[i].tools.map((t) => t.id)).toEqual(
        expectedGroups[i].toolIds,
      )
    }
  })
})
