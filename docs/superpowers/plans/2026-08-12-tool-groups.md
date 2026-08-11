# Home Tool Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Do not commit** unless the user asked — this repo only commits on explicit request.

**Goal:** Group the home tool list into four native `<details>` accordions (Text, IDs & time, Files, Diagrams), all open by default, with membership owned by a registry catalog + `groupId`.

**Architecture:** `toolGroups` catalog defines id/label/order. Each `ToolDefinition` carries `groupId`. `toolsByGroup()` buckets tools. `HomePage` maps those slices to uncontrolled `<details defaultOpen>` wrapping the existing `.tool-row` links. No persistence. Shell and `/tools/:id` unchanged.

**Tech Stack:** React 19 · Vite · TypeScript · Vitest · Playwright · existing home CSS tokens

**Spec:** `docs/superpowers/specs/2026-08-12-tool-groups-design.md`

---

## File map

**Create:**
```
testing/unit/app/HomePage.test.tsx
```

**Modify:**
```
src/tools/types.ts
src/tools/registry.ts
src/app/HomePage.tsx
src/styles/global.css
testing/unit/tools/registry.test.ts
testing/e2e/home.spec.ts
docs/features/home.md
docs/features/tool-registry.md
docs/architecture.md
docs/README.md
```

---

### Task 1: Group types, catalog, toolsByGroup

**Files:**
- Modify: `src/tools/types.ts`
- Modify: `src/tools/registry.ts`
- Test: `testing/unit/tools/registry.test.ts`

- [ ] **Step 1: Write failing registry tests**

Replace `testing/unit/tools/registry.test.ts` with:

```ts
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
```

- [ ] **Step 2: Run tests — fail (missing exports / groupId)**

```bash
npm test -- testing/unit/tools/registry.test.ts
```

Expected: FAIL — `toolGroups` / `toolsByGroup` not exported, or `groupId` undefined.

- [ ] **Step 3: Minimal types + registry**

`src/tools/types.ts` — add `ToolGroupId`, `ToolGroup`, and `groupId` on `ToolDefinition`:

```ts
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
```

`src/tools/registry.ts` — import `ToolGroup`, export catalog, set `groupId` on each tool, add `toolsByGroup`:

```ts
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
    id: 'utf-encoding',
    title: 'UTF encoding',
    description:
      'Convert text to and from UTF-8, UTF-16LE, UTF-32LE hex bytes, or Unicode code points.',
    groupId: 'text',
    component: lazy(() => import('./utf-encoding/UtfEncodingTool')),
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
```

Keep each tool’s existing `title` / `description` / `component` exactly; only add `groupId`. Inner-group order comes from `tools.filter`, so **do not reorder** the `tools` array — `utf-encoding` stays after `pdf-to-image` in the array, but appears after `base64` inside Text because filter preserves relative order: json-formatter, base64, text-case would be wrong. Relative order in the full array for Text tools is json-formatter, base64, text-case, utf-encoding — that would put text-case before utf-encoding.

**Membership order required by spec/tests:** `json-formatter`, `base64`, `utf-encoding`, `text-case`.

`tools.filter` preserves array order, so either:

- reorder `tools` so Text members appear as json-formatter, base64, utf-encoding, text-case, or
- leave array as-is and accept text-case before utf-encoding

**Do this:** keep the current `tools` array order (do not shuffle registration). Change the test’s Text `toolIds` to match filter-preserving order:

`['json-formatter', 'base64', 'text-case', 'utf-encoding']`

Wait — the spec table says `json-formatter`, `base64`, `utf-encoding`, `text-case`. Spec wins. Reorder only the four Text entries in `tools` so filter order matches the spec: move `text-case` to after `utf-encoding`, or move `utf-encoding` up next to `base64`.

**Chosen:** after adding `groupId`, move the `utf-encoding` entry to sit immediately after `base64` (still a valid registry; ids unchanged). Then Text filter order is json-formatter, base64, utf-encoding, text-case.

- [ ] **Step 4: Run tests — pass**

```bash
npm test -- testing/unit/tools/registry.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit** — skip unless user asked

---

### Task 2: HomePage accordion

**Files:**
- Create: `testing/unit/app/HomePage.test.tsx`
- Modify: `src/app/HomePage.tsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Write failing HomePage tests**

```tsx
import '@testing-library/jest-dom/vitest'

import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from '@/app/HomePage'

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

function detailsFor(label: string): HTMLDetailsElement {
  const summary = screen.getByRole('button', { name: label })
  const details = summary.closest('details')
  if (!details) throw new Error(`no details for ${label}`)
  return details
}

describe('HomePage', () => {
  it('renders four open groups with catalog labels', () => {
    renderHome()
    for (const label of ['Text', 'IDs & time', 'Files', 'Diagrams']) {
      expect(detailsFor(label)).toHaveAttribute('open')
    }
  })

  it('puts JSON formatter under Text and PlantUML under Diagrams', () => {
    renderHome()
    expect(
      within(detailsFor('Text')).getByRole('link', {
        name: /JSON formatter/i,
      }),
    ).toHaveAttribute('href', '/tools/json-formatter')
    expect(
      within(detailsFor('Diagrams')).getByRole('link', {
        name: /PlantUML/i,
      }),
    ).toHaveAttribute('href', '/tools/plantuml')
    expect(
      within(detailsFor('Text').queryByRole('link', { name: /PlantUML/i }),
    ).toBeNull()
  })

  it('lets the user collapse a group', async () => {
    const user = userEvent.setup()
    renderHome()
    const text = detailsFor('Text')
    await user.click(screen.getByRole('button', { name: 'Text' }))
    expect(text).not.toHaveAttribute('open')
    expect(detailsFor('Diagrams')).toHaveAttribute('open')
  })
})
```

Fix the `within(detailsFor('Text').queryByRole` typo — `queryByRole` is on `within(...)`:

```tsx
    expect(
      within(detailsFor('Text')).queryByRole('link', { name: /PlantUML/i }),
    ).toBeNull()
```

- [ ] **Step 2: Run tests — fail (no group summaries)**

```bash
npm test -- testing/unit/app/HomePage.test.tsx
```

Expected: FAIL — cannot find role button named Text.

- [ ] **Step 3: Implement HomePage**

Replace the flat `<ul className="tool-list">` in `src/app/HomePage.tsx` with grouped `<details defaultOpen>`. Hero block unchanged. Use `toolsByGroup`. Keep the existing row markup (link, title, description, path, SVG chevron).

```tsx
import { Link } from 'react-router-dom'
import { toolsByGroup } from '@/tools/registry'

const trustFacts = ['No accounts', 'No uploads', 'No tracking']

export function HomePage() {
  return (
    <div>
      <div className="home-hero">
        <h1 className="home-hero__brand">GJB Toolbox</h1>
        <p className="home-hero__tagline">
          Small browser utilities that run entirely in this tab. Paste, get
          your answer, and go — nothing you enter is sent anywhere.
        </p>
        <ul className="trust-pills">
          {trustFacts.map((fact) => (
            <li key={fact} className="trust-pills__item">
              {fact}
            </li>
          ))}
        </ul>
        <p className="home-hero__origin">
          I built this after getting stuck on apps that only accept tax invoices as images — I had a PDF...
        </p>
      </div>
      <div className="tool-groups">
        {toolsByGroup().map(({ group, tools: groupTools }) => (
          <details key={group.id} className="tool-group" defaultOpen>
            <summary className="tool-group__summary">
              <span>{group.label}</span>
              <svg
                className="tool-group__chevron"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M6 3.5L11 8l-5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </summary>
            <ul className="tool-list">
              {groupTools.map((t) => (
                <li key={t.id} className="tool-row">
                  <Link to={`/tools/${t.id}`} className="tool-row__link">
                    <span className="tool-row__body">
                      <span className="tool-row__title">{t.title}</span>
                      <span className="tool-row__description">
                        {t.description}
                      </span>
                    </span>
                    <span className="tool-row__path" aria-hidden="true">
                      /tools/{t.id}
                    </span>
                    <svg
                      className="tool-row__chevron"
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M6 3.5L11 8l-5 4.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  )
}
```

If `defaultOpen` does not toggle in jsdom/React (collapse test fails because `open` stays set), switch that `<details>` to a tiny local wrapper:

```tsx
function ToolGroupDetails({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <details
      className="tool-group"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="tool-group__summary">
        <span>{label}</span>
        {/* same chevron svg */}
      </summary>
      {children}
    </details>
  )
}
```

Prefer `defaultOpen` if the collapse test passes with it.

- [ ] **Step 4: Add group CSS after `.tool-row__link:focus-visible .tool-row__chevron` in `src/styles/global.css`**

```css
.tool-groups {
  margin: 0;
  padding: 0;
}

.tool-group {
  border-bottom: 1px solid var(--line);
}

.tool-group__summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) 0;
  cursor: pointer;
  list-style: none;
  font-family: var(--font-display);
  font-size: var(--text-md);
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  border-radius: var(--radius-sm);
}

.tool-group__summary::-webkit-details-marker {
  display: none;
}

.tool-group__summary::marker {
  content: '';
}

.tool-group__summary:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

.tool-group__chevron {
  flex-shrink: 0;
  color: var(--brass-strong);
  transform: rotate(0deg);
  transition: transform 160ms ease-out;
}

.tool-group[open] .tool-group__chevron {
  transform: rotate(90deg);
}

.tool-group .tool-row:last-child {
  border-bottom: none;
}
```

Do not use unicode triangles in the summary.

- [ ] **Step 5: Run HomePage tests — pass**

```bash
npm test -- testing/unit/app/HomePage.test.tsx testing/unit/tools/registry.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit** — skip unless user asked

---

### Task 3: e2e + docs

**Files:**
- Modify: `testing/e2e/home.spec.ts`
- Modify: `docs/features/home.md`
- Modify: `docs/features/tool-registry.md`
- Modify: `docs/architecture.md`
- Modify: `docs/README.md`

- [ ] **Step 1: Extend home e2e**

Keep existing assertions. Add group names:

```ts
import { test, expect } from '@playwright/test'

test('home shows brand and tools', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'GJB Toolbox' })).toBeVisible()
  await expect(page.getByRole('link', { name: /JSON formatter/i })).toBeVisible()
  await expect(
    page.getByText(
      /I built this after getting stuck on apps that only accept tax invoices as images/,
    ),
  ).toBeVisible()
  for (const name of ['Text', 'IDs & time', 'Files', 'Diagrams']) {
    await expect(page.getByRole('button', { name })).toBeVisible()
  }
})
```

- [ ] **Step 2: Update feature + architecture docs**

`docs/features/home.md` — replace the “seven tools” / flat list behavior with:

- Read tools via `toolsByGroup()`
- Four `<details defaultOpen>` sections: Text, IDs & time, Files, Diagrams
- Each summary label is the group name; tool rows inside are unchanged links
- No persisted open state

`docs/features/tool-registry.md` — document `groupId` + `toolGroups`. Checklist step: set `groupId` (add catalog group first if needed). Registered-tools table may add a Group column.

`docs/architecture.md` — registry fields include `groupId`; home reads `toolsByGroup()`.

`docs/README.md` — add this spec and plan to the tables.

- [ ] **Step 3: Run unit tests**

```bash
npm test
```

Expected: PASS (full unit suite)

- [ ] **Step 4: Commit** — skip unless user asked

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Catalog + `groupId` | Task 1 |
| Membership table | Task 1 tests + utf-encoding reorder |
| `toolsByGroup()` order | Task 1 |
| Home `<details defaultOpen>` | Task 2 |
| Collapse must work (not `open={true}`) | Task 2 collapse test |
| CSS chevron, no unicode, hairline | Task 2 CSS |
| Invariants: no Other, no empty group | Task 1 tests |
| e2e group names | Task 3 |
| Docs | Task 3 |
| Home only / no persistence | Task 2 (no storage) + docs |

No placeholders. Types (`ToolGroupId`, `toolsByGroup`) match across tasks.
