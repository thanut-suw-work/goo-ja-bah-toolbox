# Mermaid Preview Color Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Follow TDD: failing test → run → minimal code → pass → commit.

**Goal:** Color unstyled mermaid primary shapes in the card/lightbox preview with a shuffled theme-safe palette, keep raw engine SVG for default downloads, and add a per-card **Download with color?** checkbox (default off).

**Architecture:** One `mermaid.render` (unchanged). Post-process a clone in `colorizePreview`. `userFills` reads block source (not computed CSS). `palette` is curated fill/stroke/label triples. `MermaidTool` stores raw + preview + `colored`; checkbox picks which SVG to download/raster.

**Tech Stack:** React 19 · Vite · TypeScript · Vitest/jsdom · existing mermaid engine · DOMParser/XMLSerializer · no new npm

**Spec:** `docs/superpowers/specs/2026-08-14-mermaid-preview-color-design.md`

---

## File map

**Create:**
```
src/tools/mermaid/userFills.ts
src/tools/mermaid/palette.ts
src/tools/mermaid/colorizeSvg.ts
testing/unit/tools/mermaid/userFills.test.ts
testing/unit/tools/mermaid/palette.test.ts
testing/unit/tools/mermaid/colorizeSvg.test.ts
```

**Modify:**
```
src/tools/mermaid/MermaidTool.tsx
testing/unit/tools/mermaid/MermaidTool.test.tsx
docs/features/mermaid.md
docs/README.md
```

---

### Task 1: Parse user fills from source

**Files:**
- Create: `src/tools/mermaid/userFills.ts`
- Test: `testing/unit/tools/mermaid/userFills.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { parseUserFills } from '@/tools/mermaid/userFills'

describe('parseUserFills', () => {
  it('returns empty sets for unstyled source', () => {
    const u = parseUserFills('flowchart TD\n  A-->B')
    expect(u.ids.size).toBe(0)
    expect(u.skipFamilies.size).toBe(0)
    expect(u.ganttStatusNames.size).toBe(0)
  })

  it('records style id when fill is present', () => {
    const u = parseUserFills('flowchart TD\n  A-->B\n  style A fill:#f96')
    expect([...u.ids]).toEqual(['A'])
  })

  it('ignores style without fill', () => {
    const u = parseUserFills('style A stroke:#333')
    expect(u.ids.size).toBe(0)
  })

  it('records classDef+class ids when the class has fill', () => {
    const u = parseUserFills(
      'classDef foo fill:#f96\nclass A,B foo\nclass C bar',
    )
    expect(u.ids.has('A')).toBe(true)
    expect(u.ids.has('B')).toBe(true)
    expect(u.ids.has('C')).toBe(false)
  })

  it('records ::: classname when that classDef has fill', () => {
    const u = parseUserFills('classDef foo fill:#f96\nA:::foo')
    expect(u.ids.has('A')).toBe(true)
  })

  it('skips sequence when actorBkg is set', () => {
    const u = parseUserFills("%%{init: {'themeVariables': {'actorBkg': '#ff0'}}}%%")
    expect(u.skipFamilies.has('sequence')).toBe(true)
  })

  it('skips flowchart class and er when primaryColor is set', () => {
    const u = parseUserFills('primaryColor: #fff')
    expect(u.skipFamilies.has('flowchart')).toBe(true)
    expect(u.skipFamilies.has('class')).toBe(true)
    expect(u.skipFamilies.has('er')).toBe(true)
  })

  it('skips gantt when taskBkgColor is set', () => {
    const u = parseUserFills('taskBkgColor: #abc')
    expect(u.skipFamilies.has('gantt')).toBe(true)
  })

  it('records gantt task names with crit done or active', () => {
    const src = `gantt
    title Project Timeline
    Research :crit, a1, 2026-01-01, 7d
    Wireframes :a2, after a1, 5d
    Frontend :done, b1, after a2, 10d
    QA :active, c1, after b1, 5d`
    const u = parseUserFills(src)
    expect(u.ganttStatusNames.has('Research')).toBe(true)
    expect(u.ganttStatusNames.has('Frontend')).toBe(true)
    expect(u.ganttStatusNames.has('QA')).toBe(true)
    expect(u.ganttStatusNames.has('Wireframes')).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run testing/unit/tools/mermaid/userFills.test.ts`

Expected: FAIL — cannot find module `@/tools/mermaid/userFills`

- [ ] **Step 3: Write minimal implementation**

Create `src/tools/mermaid/userFills.ts`:

```ts
export type ShapeFamily = 'flowchart' | 'sequence' | 'class' | 'er' | 'gantt'

export type UserFills = {
  ids: Set<string>
  skipFamilies: Set<ShapeFamily>
  ganttStatusNames: Set<string>
}

const FILL_RE = /\bfill\s*:/i

export function parseUserFills(source: string): UserFills {
  const ids = new Set<string>()
  const skipFamilies = new Set<ShapeFamily>()
  const ganttStatusNames = new Set<string>()

  if (/\bactorBkg\s*:/.test(source)) skipFamilies.add('sequence')
  if (/\bprimaryColor\s*:/.test(source)) {
    skipFamilies.add('flowchart')
    skipFamilies.add('class')
    skipFamilies.add('er')
  }
  if (/\btaskBkgColor\s*:/.test(source)) skipFamilies.add('gantt')

  for (const m of source.matchAll(/^\s*style\s+(\S+)\s+([^\n]+)/gim)) {
    if (FILL_RE.test(m[2]!)) ids.add(m[1]!)
  }

  const classHasFill = new Map<string, boolean>()
  for (const m of source.matchAll(/^\s*classDef\s+(\S+)\s+([^\n]+)/gim)) {
    classHasFill.set(m[1]!, FILL_RE.test(m[2]!))
  }

  for (const m of source.matchAll(/^\s*class\s+(\S+)\s+(\S+)/gim)) {
    if (!classHasFill.get(m[2]!)) continue
    for (const id of m[1]!.split(',')) {
      const t = id.trim()
      if (t) ids.add(t)
    }
  }

  for (const m of source.matchAll(/(?:^|[\s])(\S+):::(\S+)/g)) {
    if (classHasFill.get(m[2]!)) ids.add(m[1]!)
  }

  for (const m of source.matchAll(
    /^\s*([^:\n]+):([^\n]*\b(?:crit|done|active)\b[^\n]*)/gim,
  )) {
    const name = m[1]!.trim()
    if (!name || /^(title|dateFormat|axisFormat|section|excludes)$/i.test(name)) {
      continue
    }
    ganttStatusNames.add(name)
  }

  return { ids, skipFamilies, ganttStatusNames }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run testing/unit/tools/mermaid/userFills.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/mermaid/userFills.ts testing/unit/tools/mermaid/userFills.test.ts
git commit -m "$(cat <<'EOF'
feat(mermaid): parse source for user-authored fills

EOF
)"
```

---

### Task 2: Theme-safe palette + shuffle

**Files:**
- Create: `src/tools/mermaid/palette.ts`
- Test: `testing/unit/tools/mermaid/palette.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { PALETTES, shuffle, takeColor } from '@/tools/mermaid/palette'

const BRASS = ['#d99a3f', '#e7ab55', '#a35a17']
const PURPLE = ['#6e3cff', '#7c3aed', '#8b5cf6', '#6366f1', '#4f46e5']

describe('PALETTES', () => {
  it('has 8 triples for dark and default', () => {
    expect(PALETTES.dark).toHaveLength(8)
    expect(PALETTES.default).toHaveLength(8)
  })

  it('uses spec label colors', () => {
    for (const t of PALETTES.dark) expect(t.label).toBe('#e6edf3')
    for (const t of PALETTES.default) expect(t.label).toBe('#14171d')
  })

  it('contains no brass purple or indigo hexes', () => {
    const hexes = [...PALETTES.dark, ...PALETTES.default].flatMap((t) => [
      t.fill.toLowerCase(),
      t.stroke.toLowerCase(),
      t.label.toLowerCase(),
    ])
    for (const banned of [...BRASS, ...PURPLE]) {
      expect(hexes).not.toContain(banned)
    }
  })
})

describe('shuffle', () => {
  it('is a permutation of the input', () => {
    const rng = (() => {
      let i = 0
      const seq = [0.1, 0.9, 0.3, 0.7, 0.2, 0.8, 0.4, 0.6]
      return () => seq[i++ % seq.length]!
    })()
    const src = [0, 1, 2, 3, 4, 5, 6, 7]
    const out = shuffle(src, rng)
    expect([...out].sort((a, b) => a - b)).toEqual(src)
    expect(out).not.toEqual(src)
  })
})

describe('takeColor', () => {
  it('wraps and skips an immediate repeat', () => {
    const colors = [
      { fill: 'a', stroke: 's', label: 'l' },
      { fill: 'b', stroke: 's', label: 'l' },
    ]
    const c = { cursor: 0 }
    const first = takeColor(colors, c, null)
    expect(first.fill).toBe('a')
    c.cursor = 2
    const wrapped = takeColor(colors, c, 'a')
    expect(wrapped.fill).toBe('b')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run testing/unit/tools/mermaid/palette.test.ts`

Expected: FAIL — cannot find module `@/tools/mermaid/palette`

- [ ] **Step 3: Write minimal implementation**

Create `src/tools/mermaid/palette.ts`:

```ts
export type ColorTriple = { fill: string; stroke: string; label: string }

export const PALETTES: Record<'dark' | 'default', ColorTriple[]> = {
  dark: [
    { fill: '#2f5d50', stroke: '#7aa894', label: '#e6edf3' },
    { fill: '#35536e', stroke: '#7a9bb8', label: '#e6edf3' },
    { fill: '#6b5344', stroke: '#c4a890', label: '#e6edf3' },
    { fill: '#3d5c5c', stroke: '#7aabab', label: '#e6edf3' },
    { fill: '#5c4a32', stroke: '#c4a878', label: '#e6edf3' },
    { fill: '#4a5a3c', stroke: '#9bb07a', label: '#e6edf3' },
    { fill: '#5a4040', stroke: '#c49090', label: '#e6edf3' },
    { fill: '#3c4a5c', stroke: '#7a90a8', label: '#e6edf3' },
  ],
  default: [
    { fill: '#c5d9ce', stroke: '#2f5d50', label: '#14171d' },
    { fill: '#c5d0dc', stroke: '#35536e', label: '#14171d' },
    { fill: '#e2d4c4', stroke: '#6b5344', label: '#14171d' },
    { fill: '#c5d6d6', stroke: '#3d5c5c', label: '#14171d' },
    { fill: '#ddd4c4', stroke: '#5c4a32', label: '#14171d' },
    { fill: '#d4dcc5', stroke: '#4a5a3c', label: '#14171d' },
    { fill: '#e0cccc', stroke: '#5a4040', label: '#14171d' },
    { fill: '#d0d4dc', stroke: '#3c4a5c', label: '#14171d' },
  ],
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = out[i]!
    out[i] = out[j]!
    out[j] = tmp
  }
  return out
}

export function takeColor(
  colors: ColorTriple[],
  state: { cursor: number },
  prevFill: string | null,
): ColorTriple {
  let idx = state.cursor % colors.length
  if (prevFill && colors[idx]!.fill === prevFill && colors.length > 1) {
    idx = (idx + 1) % colors.length
    state.cursor += 1
  }
  state.cursor += 1
  return colors[idx]!
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run testing/unit/tools/mermaid/palette.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/tools/mermaid/palette.ts testing/unit/tools/mermaid/palette.test.ts
git commit -m "$(cat <<'EOF'
feat(mermaid): add theme-safe preview color palette

EOF
)"
```

---

### Task 3: Colorize SVG clone

**Files:**
- Create: `src/tools/mermaid/colorizeSvg.ts`
- Test: `testing/unit/tools/mermaid/colorizeSvg.test.ts`

Use a **constant rng** `() => 0` so shuffle leaves palette order (Fisher–Yates with `j = 0` always swaps with 0… still permutes). For stable assertions, read stamped fills and check they are in `PALETTES[theme]` and that two User rects match.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { colorizePreview } from '@/tools/mermaid/colorizeSvg'
import { PALETTES } from '@/tools/mermaid/palette'

const rng0 = () => 0

function fills(svg: string, selector: string): string[] {
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml')
  return [...doc.querySelectorAll(selector)].map(
    (el) => (el as Element).getAttribute('fill') ?? '',
  )
}

const FLOW = `<svg xmlns="http://www.w3.org/2000/svg" aria-roledescription="flowchart-v2">
  <g class="node" data-id="A"><rect class="label-container" fill="#1f2020" stroke="#ccc"/><text fill="#ccc">Start</text></g>
  <g class="node" data-id="B"><polygon class="label-container" fill="#1f2020" stroke="#ccc"/></g>
  <g class="cluster"><rect fill="#111"/></g>
</svg>`

const SEQ = `<svg xmlns="http://www.w3.org/2000/svg" aria-roledescription="sequence">
  <rect class="actor actor-top" name="User" fill="#1f2020" stroke="#ccc"/>
  <rect class="actor actor-bottom" name="User" fill="#1f2020" stroke="#ccc"/>
  <rect class="actor actor-top" name="App" fill="#1f2020" stroke="#ccc"/>
  <line class="actor-line" stroke="#999"/>
</svg>`

const CLASS = `<svg xmlns="http://www.w3.org/2000/svg" aria-roledescription="class">
  <g class="classGroup" data-id="Animal"><rect fill="#1f2020" stroke="#ccc"/><text>Animal</text></g>
  <g class="classGroup" data-id="Dog"><rect fill="#1f2020" stroke="#ccc"/></g>
</svg>`

const ER = `<svg xmlns="http://www.w3.org/2000/svg" aria-roledescription="er">
  <g class="node" data-id="CUSTOMER"><rect class="label-container" fill="#1f2020" stroke="#ccc"/></g>
  <g class="node" data-id="ORDER"><rect class="label-container" fill="#1f2020" stroke="#ccc"/></g>
</svg>`

const GANTT = `<svg xmlns="http://www.w3.org/2000/svg" aria-roledescription="gantt">
  <rect class="section section0" fill="#b4ac76"/>
  <rect class="task task0" fill="#595c5c"/>
  <text>Research</text>
  <rect class="task task1" fill="#595c5c"/>
  <text>Wireframes</text>
</svg>`

describe('colorizePreview', () => {
  it('recolors unstyled flowchart nodes and skips clusters', () => {
    const { previewSvg, colored } = colorizePreview(FLOW, 'flowchart TD\nA-->B', 'dark', rng0)
    expect(colored).toBe(true)
    const nodeFills = fills(previewSvg, 'g.node .label-container')
    expect(nodeFills[0]).not.toBe('#1f2020')
    expect(PALETTES.dark.some((t) => t.fill === nodeFills[0])).toBe(true)
    expect(fills(previewSvg, 'g.cluster rect')[0]).toBe('#111')
  })

  it('leaves a style-fill id unchanged', () => {
    const src = 'flowchart TD\nA-->B\nstyle A fill:#f96'
    const { previewSvg } = colorizePreview(FLOW, src, 'dark', rng0)
    const a = new DOMParser()
      .parseFromString(previewSvg, 'image/svg+xml')
      .querySelector('g.node[data-id="A"] .label-container')
    expect(a?.getAttribute('fill')).toBe('#1f2020')
  })

  it('paints sequence top and bottom the same for one name', () => {
    const { previewSvg, colored } = colorizePreview(SEQ, 'sequenceDiagram\nparticipant User\nparticipant App', 'dark', rng0)
    expect(colored).toBe(true)
    const user = fills(previewSvg, 'rect.actor[name="User"]')
    expect(user[0]).toBe(user[1])
    expect(user[0]).not.toBe('#1f2020')
    const app = fills(previewSvg, 'rect.actor[name="App"]')
    expect(app[0]).not.toBe(user[0])
  })

  it('recolors class and er nodes', () => {
    expect(colorizePreview(CLASS, 'classDiagram', 'dark', rng0).colored).toBe(true)
    expect(colorizePreview(ER, 'erDiagram', 'dark', rng0).colored).toBe(true)
    expect(
      fills(colorizePreview(CLASS, 'classDiagram', 'dark', rng0).previewSvg, 'g.classGroup rect')[0],
    ).not.toBe('#1f2020')
  })

  it('recolors gantt tasks not sections and skips crit names', () => {
    const src = 'gantt\nResearch :crit, a1, 2026-01-01, 7d\nWireframes :a2, after a1, 5d'
    const { previewSvg } = colorizePreview(GANTT, src, 'dark', rng0)
    expect(fills(previewSvg, 'rect.section')[0]).toBe('#b4ac76')
    const tasks = fills(previewSvg, 'rect.task')
    expect(tasks[0]).toBe('#595c5c')
    expect(tasks[1]).not.toBe('#595c5c')
  })

  it('passthrough unsupported types', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" aria-roledescription="pie"></svg>'
    const r = colorizePreview(svg, 'pie', 'dark', rng0)
    expect(r.colored).toBe(false)
    expect(r.previewSvg).toBe(svg)
  })

  it('returns raw svg when XML is invalid', () => {
    const svg = '<not-svg'
    const r = colorizePreview(svg, 'flowchart TD', 'dark', rng0)
    expect(r.colored).toBe(false)
    expect(r.previewSvg).toBe(svg)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run testing/unit/tools/mermaid/colorizeSvg.test.ts`

Expected: FAIL — cannot find module `@/tools/mermaid/colorizeSvg`

- [ ] **Step 3: Write minimal implementation**

Create `src/tools/mermaid/colorizeSvg.ts`.

Public API: `colorizePreview(svg, source, theme, rng?)`. Internals: detect `aria-roledescription`; walk shapes; `parseUserFills`; `shuffle(PALETTES[theme], rng)`; `takeColor`; stamp fill/stroke/label.

Rules (must match spec):

- flowchart / er: `g.node` not `.cluster`; geom = `.label-container, rect, polygon, circle`; id = `data-id` or stripped `flowchart-` prefix; skip if `ids` has id or family skipped
- sequence: group `rect.actor` by `name`; skip family or (if name in ids); same color top+bottom; do not paint `.actor-line`
- class: `g.classGroup`; id = `data-id` or first text; skip ids / family
- gantt: `rect.task` in document order; pair with following `text` sibling name when possible, else sequential names from source is **not** required — use the next `text` element's trimmed text after that rect (see fixture: Research then Wireframes). Skip if name in `ganttStatusNames` or family skipped. Do not paint `rect.section`
- labels: `text`, `tspan`, `.nodeLabel` inside the group get `fill` = triple.label and `style.color`
- `parsererror` or missing svg → throw → catch in `colorizePreview` → `{ previewSvg: svg, colored: false }`
- `colored` true only if at least one geom fill changed

Gantt name: for each `rect.task`, find the first following `text` in document order that has not been consumed.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run testing/unit/tools/mermaid/colorizeSvg.test.ts`

Expected: PASS. If gantt name pairing fails, fix walker so fixture `Research` (crit) stays `#595c5c` and `Wireframes` changes.

- [ ] **Step 5: Commit**

```bash
git add src/tools/mermaid/colorizeSvg.ts testing/unit/tools/mermaid/colorizeSvg.test.ts
git commit -m "$(cat <<'EOF'
feat(mermaid): colorize preview SVG clones

EOF
)"
```

---

### Task 4: Wire MermaidTool + checkbox

**Files:**
- Modify: `src/tools/mermaid/MermaidTool.tsx`
- Test: `testing/unit/tools/mermaid/MermaidTool.test.tsx`

Impeccable Operate: native checkbox in the existing `IoPanel` actions row. No new Switch component.

- [ ] **Step 1: Write failing UI tests**

Add mock next to existing `renderBlock` / `svgToRaster` mocks:

```ts
vi.mock('@/tools/mermaid/colorizeSvg', () => ({
  colorizePreview: vi.fn((svg: string) => ({ previewSvg: svg, colored: false })),
}))
```

Import `colorizePreview` from `@/tools/mermaid/colorizeSvg`. In `beforeEach`, `vi.mocked(colorizePreview).mockReset()` then default:

```ts
vi.mocked(colorizePreview).mockImplementation((svg: string) => ({
  previewSvg: svg,
  colored: false,
}))
```

Add tests:

```ts
it('hides Download with color when colorize reports colored false', async () => {
  vi.mocked(renderBlock).mockResolvedValue({
    ok: true,
    svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
  })
  const user = userEvent.setup()
  renderTool(<MermaidTool />)
  await user.type(screen.getByLabelText('Mermaid source'), 'pie')
  await user.click(screen.getByRole('button', { name: 'Visualize' }))
  await screen.findByRole('button', { name: 'Download SVG' })
  expect(
    screen.queryByRole('checkbox', { name: 'Download with color?' }),
  ).not.toBeInTheDocument()
})

it('defaults the color download checkbox off and downloads raw svg', async () => {
  vi.mocked(colorizePreview).mockReturnValue({
    previewSvg: '<svg xmlns="http://www.w3.org/2000/svg"><g id="c"/></svg>',
    colored: true,
  })
  const raw = '<svg xmlns="http://www.w3.org/2000/svg"><g id="raw"/></svg>'
  vi.mocked(renderBlock).mockResolvedValue({ ok: true, svg: raw })
  vi.mocked(svgToRaster).mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
  const user = userEvent.setup()
  renderTool(<MermaidTool />)
  await user.type(screen.getByLabelText('Mermaid source'), 'flowchart TD')
  await user.click(screen.getByRole('button', { name: 'Visualize' }))
  const box = await screen.findByRole('checkbox', { name: 'Download with color?' })
  expect(box).not.toBeChecked()
  await user.click(screen.getByRole('button', { name: 'Download SVG' }))
  expect(vi.mocked(URL.createObjectURL)).toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Download PNG' }))
  expect(svgToRaster).toHaveBeenCalledWith(raw, { format: 'png', scale: 1 })
})

it('downloads the preview clone when Download with color is on', async () => {
  const preview = '<svg xmlns="http://www.w3.org/2000/svg"><g id="c"/></svg>'
  vi.mocked(colorizePreview).mockReturnValue({ previewSvg: preview, colored: true })
  vi.mocked(renderBlock).mockResolvedValue({
    ok: true,
    svg: '<svg xmlns="http://www.w3.org/2000/svg"><g id="raw"/></svg>',
  })
  vi.mocked(svgToRaster).mockResolvedValue(new Blob(['png'], { type: 'image/png' }))
  const user = userEvent.setup()
  renderTool(<MermaidTool />)
  await user.type(screen.getByLabelText('Mermaid source'), 'flowchart TD')
  await user.click(screen.getByRole('button', { name: 'Visualize' }))
  await user.click(await screen.findByRole('checkbox', { name: 'Download with color?' }))
  await user.click(screen.getByRole('button', { name: 'Download PNG' }))
  expect(svgToRaster).toHaveBeenCalledWith(preview, { format: 'png', scale: 1 })
})

it('puts the preview clone in the lightbox', async () => {
  vi.mocked(colorizePreview).mockReturnValue({
    previewSvg: '<svg xmlns="http://www.w3.org/2000/svg"><title>colored</title></svg>',
    colored: true,
  })
  vi.mocked(renderBlock).mockResolvedValue({
    ok: true,
    svg: '<svg xmlns="http://www.w3.org/2000/svg"><title>raw</title></svg>',
  })
  const user = userEvent.setup()
  renderTool(<MermaidTool />)
  await user.type(screen.getByLabelText('Mermaid source'), 'flowchart TD')
  await user.click(screen.getByRole('button', { name: 'Visualize' }))
  await user.click(await screen.findByRole('button', { name: 'View' }))
  const dialog = await screen.findByRole('dialog')
  expect(dialog).toHaveTextContent('colored')
  expect(dialog).not.toHaveTextContent('raw')
})
```

Existing tests that download PNG must still pass (passthrough mock → raw svg).

- [ ] **Step 2: Run tests to verify new ones fail**

Run: `npx vitest run testing/unit/tools/mermaid/MermaidTool.test.tsx`

Expected: new checkbox tests FAIL (checkbox missing). Existing tests still PASS.

- [ ] **Step 3: Wire MermaidTool**

Change success result type:

```ts
export type DiagramResult =
  | {
      ok: true
      svg: string
      previewSvg: string
      colored: boolean
      pngError: string | null
    }
  | { ok: false; error: string }
```

Import `colorizePreview` from `./colorizeSvg`. After `renderBlock` ok, call `colorizePreview(r.svg, block.text, mermaidTheme(resolvedRef.current))`.

State: `const [colorDownload, setColorDownload] = useState<Record<number, boolean>>({})`

Visualize `mode === 'click'`: `setColorDownload({})`. Theme mode: leave it.

Actions order: View, then if `result.colored` a label+checkbox `Download with color?` (`checked={Boolean(colorDownload[index])}`, `onChange` sets that index), then Download SVG, Download PNG.

Preview `dangerouslySetInnerHTML` and lightbox `svg=` use `result.previewSvg`.

`onDownloadSvg` / `onDownloadPng` take index, read result, use `colorDownload[index] ? previewSvg : svg`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run testing/unit/tools/mermaid/MermaidTool.test.tsx`

Expected: PASS (old + new)

Run: `npx vitest run testing/unit/tools/mermaid/`

Expected: PASS all mermaid unit tests

- [ ] **Step 5: Commit**

```bash
git add src/tools/mermaid/MermaidTool.tsx testing/unit/tools/mermaid/MermaidTool.test.tsx
git commit -m "$(cat <<'EOF'
feat(mermaid): add preview color overlay and download toggle

EOF
)"
```

---

### Task 5: Feature docs

**Files:**
- Modify: `docs/features/mermaid.md`
- Modify: `docs/README.md`

- [ ] **Step 1: Patch feature doc**

In Behavior, success-card bullet: preview/lightbox show the colorized clone when overlay ran. Actions: **View** · **Download with color?** (checkbox, default off, only if overlay painted at least one shape) · **Download SVG** · **Download PNG**. Off → raw engine files. On → clone. Theme flip re-rolls overlay, keeps checkbox.

Add an **Preview color** subsection under Engine:

- Post-process clone; one render; `colorizePreview` in `colorizeSvg.ts`
- Primary shapes per spec table; user fills from source; gantt `crit|done|active` skipped
- Colorize throw → raw SVG, no checkbox
- Tests: `userFills.test.ts`, `palette.test.ts`, `colorizeSvg.test.ts`; UI mocks `colorizePreview`

- [ ] **Step 2: Patch docs/README.md**

Add spec row: `superpowers/specs/2026-08-14-mermaid-preview-color-design.md` — Mermaid preview color overlay + download checkbox

Add plan row: `superpowers/plans/2026-08-14-mermaid-preview-color.md`

- [ ] **Step 3: Commit**

```bash
git add docs/features/mermaid.md docs/README.md
git commit -m "$(cat <<'EOF'
docs(mermaid): document preview color overlay

EOF
)"
```

No extra unit test for markdown.

---

## Self-review (plan vs spec)

| Spec item | Task |
|-----------|------|
| Clone after one render | 3, 4 |
| Checkbox default off, before downloads | 4 |
| Hide checkbox when `colored === false` | 4 |
| Primary shape table | 3 |
| User fills / skip families / gantt status | 1, 3 |
| Palette hexes, no purple/brass | 2 |
| Shuffle + wrap skip repeat | 2 |
| Theme flip re-roll, keep toggle | 4 (colorize on each visualize; click clears toggles only) |
| Lightbox = previewSvg | 4 |
| Colorize throw → raw | 3 |
| Docs | 5 |
| No mermaid boot in unit tests | 1–4 |
| Privacy / no persistence | 4 (React state only) |
