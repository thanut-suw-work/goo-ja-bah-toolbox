# Mermaid Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Do not commit** unless the user asked — this repo only commits on explicit request.

**Goal:** Add a client-only Mermaid tool that pastes or opens one `.mmd`/Markdown buffer, Visualize-renders every mermaid/mmd fence (or the whole buffer) as stacked SVG cards, and downloads SVG + PNG per diagram.

**Architecture:** Pure `parse.ts` splits CommonMark-ish fences. `render.ts` dynamic-imports npm `mermaid`, initializes `securityLevel: 'strict'`, and sequential-`render`s. `MermaidTool.tsx` clones PlantUML stacked UI. Lift lightbox/panZoom to `src/tools/shared/` so both tools share them. PNG via existing `svgToRaster(svg, { format: 'png', scale: 1 })`. Registry `React.lazy` + dynamic `import('mermaid')` keeps the engine out of the home/main chunk.

**Tech Stack:** React 19 · Vite · TypeScript · Vitest · `mermaid` ^11 (MIT) · existing `ToolLayout` / `IoPanel` / `ActionBar` / Button / Textarea / Input

**Spec:** `docs/superpowers/specs/2026-08-12-mermaid-viewer-design.md`

---

## File map

**Create:**
```
src/tools/mermaid/parse.ts
src/tools/mermaid/render.ts
src/tools/mermaid/MermaidTool.tsx
src/tools/shared/panZoom.ts          # moved
src/tools/shared/DiagramLightbox.tsx # moved
testing/unit/tools/mermaid/parse.test.ts
testing/unit/tools/mermaid/render.test.ts
testing/unit/tools/mermaid/MermaidTool.test.tsx
testing/unit/tools/shared/panZoom.test.ts  # moved
docs/features/mermaid.md
```

**Modify:**
```
package.json                          # "mermaid": "^11.x"
src/tools/types.ts                    # ToolId | 'mermaid'
src/tools/registry.ts                 # lazy mermaid entry
src/tools/plantuml/PlantumlTool.tsx   # import lightbox from shared
src/styles/global.css                 # .plantuml-lightbox → .diagram-lightbox
testing/unit/tools/registry.test.ts
docs/features/tool-registry.md
docs/README.md
docs/architecture.md
PRODUCT.md
```

**Delete after move:**
```
src/tools/plantuml/panZoom.ts
src/tools/plantuml/DiagramLightbox.tsx
testing/unit/tools/plantuml/panZoom.test.ts
```

**Import only:**
```
src/tools/shared/svgToRaster.ts
```

---

### Task 1: Lift panZoom to shared

**Files:**
- Create: `src/tools/shared/panZoom.ts` (same contents as plantuml)
- Create: `testing/unit/tools/shared/panZoom.test.ts` (import `@/tools/shared/panZoom`)
- Modify: `src/tools/plantuml/DiagramLightbox.tsx` import to `@/tools/shared/panZoom`
- Delete: `src/tools/plantuml/panZoom.ts`, `testing/unit/tools/plantuml/panZoom.test.ts`

- [ ] **Step 1: Write failing shared panZoom tests**

Copy `testing/unit/tools/plantuml/panZoom.test.ts` to `testing/unit/tools/shared/panZoom.test.ts` and change the import to:

```ts
} from '@/tools/shared/panZoom'
```

- [ ] **Step 2: Run tests — fail (module not found)**

```bash
npm test -- testing/unit/tools/shared/panZoom.test.ts
```

Expected: FAIL cannot find `@/tools/shared/panZoom`

- [ ] **Step 3: Move implementation**

Copy `src/tools/plantuml/panZoom.ts` → `src/tools/shared/panZoom.ts` unchanged. Point `DiagramLightbox.tsx` at `@/tools/shared/panZoom`. Delete old panZoom files.

- [ ] **Step 4: Run tests — pass**

```bash
npm test -- testing/unit/tools/shared/panZoom.test.ts testing/unit/tools/plantuml
```

Expected: PASS. PlantUML still green.

- [ ] **Step 5: Commit** — skip unless user asked

---

### Task 2: Lift DiagramLightbox to shared

**Files:**
- Create: `src/tools/shared/DiagramLightbox.tsx`
- Modify: `src/tools/plantuml/PlantumlTool.tsx` import
- Modify: `src/styles/global.css` class rename
- Delete: `src/tools/plantuml/DiagramLightbox.tsx`

- [ ] **Step 1: Shared lightbox + generic CSS class**

`src/tools/shared/DiagramLightbox.tsx` is the plantuml file with:

- `from '@/tools/shared/panZoom'`
- `aria-labelledby="diagram-lightbox-title"`
- `id="diagram-lightbox-title"`
- `className="diagram-lightbox flex flex-col overflow-hidden"`

In `global.css` rename `.plantuml-lightbox` (and `::backdrop`, `:focus`, `:focus-visible`) to `.diagram-lightbox`. Keep the comment but say both diagram tools.

`PlantumlTool.tsx`: `import { DiagramLightbox } from '@/tools/shared/DiagramLightbox'`

Delete `src/tools/plantuml/DiagramLightbox.tsx`.

- [ ] **Step 2: Run PlantUML UI tests**

```bash
npm test -- testing/unit/tools/plantuml/PlantumlTool.test.tsx
```

Expected: PASS (View still opens dialog)

- [ ] **Step 3: Commit** — skip unless user asked

---

### Task 3: Parse mermaid fences

**Files:**
- Create: `testing/unit/tools/mermaid/parse.test.ts`
- Create: `src/tools/mermaid/parse.ts`

- [ ] **Step 1: Write failing parse tests**

```ts
import { describe, it, expect } from 'vitest'
import { parseMermaid } from '@/tools/mermaid/parse'

describe('parseMermaid', () => {
  it('uses the whole buffer as one block when there is no mermaid fence', () => {
    const src = 'flowchart TD\n  A-->B'
    const blocks = parseMermaid(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.startLine).toBe(1)
    expect(blocks[0]!.text).toBe(src)
  })

  it('preserves CRLF whole-buffer text', () => {
    const src = 'flowchart TD\r\n  A-->B'
    expect(parseMermaid(src)[0]!.text).toBe(src)
  })

  it('parses several mermaid fences in file order', () => {
    const src = [
      '# title',
      '```mermaid',
      'flowchart TD',
      '  A-->B',
      '```',
      'prose',
      '```mermaid',
      'sequenceDiagram',
      '  Alice->>Bob: hi',
      '```',
    ].join('\n')
    const blocks = parseMermaid(src)
    expect(blocks).toHaveLength(2)
    expect(blocks[0]!.startLine).toBe(3)
    expect(blocks[0]!.text).toBe('flowchart TD\n  A-->B')
    expect(blocks[1]!.startLine).toBe(8)
    expect(blocks[1]!.text).toContain('Alice->>Bob: hi')
    expect(blocks.map((b) => b.text).join('|')).not.toContain('prose')
    expect(blocks.map((b) => b.text).join('|')).not.toContain('# title')
  })

  it('treats mmd info string and Mermaid case-insensitive as fences', () => {
    const src = [
      '```mmd',
      'flowchart TD',
      '  A-->B',
      '```',
      '```Mermaid',
      'flowchart TD',
      '  C-->D',
      '```',
    ].join('\n')
    expect(parseMermaid(src)).toHaveLength(2)
  })

  it('counts info-string extra tokens', () => {
    const src = ['```mermaid title=foo', 'flowchart TD', '  A-->B', '```'].join(
      '\n',
    )
    expect(parseMermaid(src)).toHaveLength(1)
    expect(parseMermaid(src)[0]!.text).toBe('flowchart TD\n  A-->B')
  })

  it('ignores js, plantuml, and mermaidjs fences', () => {
    const src = [
      '```js',
      'console.log(1)',
      '```',
      '```plantuml',
      '@startuml',
      '@enduml',
      '```',
      '```mermaidjs',
      'flowchart TD',
      '```',
    ].join('\n')
    const blocks = parseMermaid(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.startLine).toBe(1)
    expect(blocks[0]!.text).toBe(src)
  })

  it('parses tilde mermaid fences', () => {
    const src = ['~~~mermaid', 'flowchart TD', '  A-->B', '~~~'].join('\n')
    const blocks = parseMermaid(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.startLine).toBe(2)
    expect(blocks[0]!.text).toBe('flowchart TD\n  A-->B')
  })

  it('emits an unclosed fence at EOF', () => {
    const src = ['```mermaid', 'flowchart TD', '  A-->B'].join('\n')
    const blocks = parseMermaid(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.startLine).toBe(2)
    expect(blocks[0]!.text).toBe('flowchart TD\n  A-->B')
  })

  it('does not treat a 4-space indented opener as a fence', () => {
    const src = ['    ```mermaid', 'flowchart TD', '    ```'].join('\n')
    const blocks = parseMermaid(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.text).toBe(src)
  })

  it('does not include fence marker lines in engine text', () => {
    const src = ['```mermaid', 'flowchart TD', '```'].join('\n')
    expect(parseMermaid(src)[0]!.text).toBe('flowchart TD')
    expect(parseMermaid(src)[0]!.text).not.toContain('```')
  })
})
```

- [ ] **Step 2: Run — fail (module not found)**

```bash
npm test -- testing/unit/tools/mermaid/parse.test.ts
```

- [ ] **Step 3: Implement `parse.ts`**

```ts
export type ParsedBlock = {
  startLine: number
  text: string
}

function splitLines(source: string): string[] {
  return source.split(/\r\n|\r|\n/)
}

function infoIsMermaid(info: string): boolean {
  const first = info.trim().split(/\s+/)[0] ?? ''
  const lang = first.toLowerCase()
  return lang === 'mermaid' || lang === 'mmd'
}

function isCloser(line: string, char: string, len: number): boolean {
  const m = line.match(/^( {0,3})([`~]{3,})\s*$/)
  if (!m) return false
  if (m[2]![0] !== char) return false
  return m[2]!.length >= len
}

export function parseMermaid(source: string): ParsedBlock[] {
  const raw = splitLines(source)
  const blocks: ParsedBlock[] = []
  let open: {
    char: string
    len: number
    startLine: number
    lines: string[]
  } | null = null

  for (let i = 0; i < raw.length; i++) {
    const line = raw[i]!
    if (open) {
      if (isCloser(line, open.char, open.len)) {
        blocks.push({
          startLine: open.startLine,
          text: open.lines.join('\n'),
        })
        open = null
      } else {
        open.lines.push(line)
      }
      continue
    }
    const m = line.match(/^( {0,3})([`~]{3,})(.*)$/)
    if (!m) continue
    if (!infoIsMermaid(m[3] ?? '')) continue
    const fence = m[2]!
    open = {
      char: fence[0]!,
      len: fence.length,
      startLine: i + 2,
      lines: [],
    }
  }

  if (open) {
    blocks.push({ startLine: open.startLine, text: open.lines.join('\n') })
  }

  if (blocks.length === 0) {
    return [{ startLine: 1, text: source }]
  }
  return blocks
}
```

Note: empty fence body → `startLine` is opener+1 even if past EOF; that's fine (engine errors).

- [ ] **Step 4: Run tests — pass**

```bash
npm test -- testing/unit/tools/mermaid/parse.test.ts
```

- [ ] **Step 5: Commit** — skip unless user asked

---

### Task 4: Render mapper + engine wiring (no mermaid boot)

**Files:**
- Create: `testing/unit/tools/mermaid/render.test.ts`
- Create: `src/tools/mermaid/render.ts`
- Modify: `package.json` — add `mermaid`

- [ ] **Step 1: Write failing mapper + source-scan tests**

```ts
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { mapEngineError } from '@/tools/mermaid/render'

describe('mapEngineError', () => {
  it('returns the raw message when no line number is present', () => {
    expect(mapEngineError('Syntax error', 10)).toEqual({
      error: 'Syntax error',
      line: null,
    })
  })

  it('maps a block-relative line onto the file line', () => {
    const r = mapEngineError('Parse error on line 3:', 10)
    expect(r.line).toBe(12)
    expect(r.error).toBe('Line 12: Parse error on line 12:')
  })

  it('keeps engine line = file line when startLine is 1', () => {
    const r = mapEngineError('Error line 4', 1)
    expect(r.line).toBe(4)
    expect(r.error).toBe('Line 4: Error line 4')
  })

  it('stringifies a non-string engine payload instead of throwing', () => {
    const r = mapEngineError(undefined, 1)
    expect(r.line).toBeNull()
    expect(r.error.length).toBeGreaterThan(0)
  })

  it('uses Mermaid engine error when the message is empty', () => {
    expect(mapEngineError('', 1).error).toBe('Mermaid engine error')
  })
})

describe('engine load wiring', () => {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(
    path.resolve(here, '../../../../src/tools/mermaid/render.ts'),
    'utf8',
  )

  it('dynamic-imports mermaid so Vite can split the chunk', () => {
    expect(src).toMatch(/import\(['"]mermaid['"]\)/)
  })

  it('forces securityLevel strict and never registers icon packs', () => {
    expect(src).toMatch(/securityLevel:\s*['"]strict['"]/)
    expect(src).not.toMatch(/registerIconPacks/)
    expect(src).not.toMatch(/securityLevel:\s*['"]loose['"]/)
    expect(src).not.toMatch(/securityLevel:\s*['"]antiscript['"]/)
    expect(src).not.toMatch(/startOnLoad:\s*true/)
  })
})
```

- [ ] **Step 2: Run — fail**

```bash
npm test -- testing/unit/tools/mermaid/render.test.ts
```

- [ ] **Step 3: Install mermaid + implement render.ts**

```bash
npm install mermaid
```

Pin whatever MIT `^11` npm resolves. Do not add `@mermaid-js/layout-elk`.

```ts
export type EngineRenderResult =
  | { ok: true; svg: string }
  | { ok: false; error: string; line: number | null }

const RENDER_TIMEOUT_MS = 30_000

type MermaidApi = {
  initialize: (config: Record<string, unknown>) => void
  render: (
    id: string,
    text: string,
  ) => Promise<{ svg: string }>
}

function asErrorMessage(raw: unknown): string {
  if (typeof raw === 'string') return raw
  if (raw instanceof Error) return raw.message || String(raw)
  try {
    return String(raw ?? '')
  } catch {
    return 'Mermaid engine error'
  }
}

export function mapEngineError(
  message: unknown,
  startLine: number,
): { error: string; line: number | null } {
  const text = asErrorMessage(message)
  if (!text) return { error: 'Mermaid engine error', line: null }
  const m = text.match(/line\s+(\d+)/i)
  if (!m) return { error: text, line: null }
  const engineLine = Number.parseInt(m[1]!, 10)
  const fileLine = engineLine + startLine - 1
  const rewritten = text.replace(/line\s+\d+/i, `line ${fileLine}`)
  return { error: `Line ${fileLine}: ${rewritten}`, line: fileLine }
}

let enginePromise: Promise<MermaidApi> | null = null
let queue: Promise<unknown> = Promise.resolve()
let renderSeq = 0

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job)
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

async function loadEngineOnce(): Promise<MermaidApi> {
  const mod = await import('mermaid')
  const mermaid = (mod.default ?? mod) as MermaidApi
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' })
  return mermaid
}

export function loadEngine(): Promise<MermaidApi> {
  if (!enginePromise) {
    enginePromise = loadEngineOnce().catch((err: unknown) => {
      enginePromise = null
      throw err
    })
  }
  return enginePromise
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Mermaid render timed out'))
    }, ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

export function renderBlock(
  text: string,
  startLine: number,
): Promise<EngineRenderResult> {
  return enqueue(async () => {
    try {
      const mermaid = await loadEngine()
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'default',
      })
      const id = `mmd-${++renderSeq}`
      const { svg } = await withTimeout(
        mermaid.render(id, text),
        RENDER_TIMEOUT_MS,
      )
      return { ok: true as const, svg }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      const mapped = mapEngineError(message, startLine)
      return { ok: false as const, error: mapped.error, line: mapped.line }
    }
  })
}
```

- [ ] **Step 4: Run tests — pass**

```bash
npm test -- testing/unit/tools/mermaid/render.test.ts
```

- [ ] **Step 5: Commit** — skip unless user asked

---

### Task 5: MermaidTool UI (mock engine)

**Files:**
- Create: `testing/unit/tools/mermaid/MermaidTool.test.tsx`
- Create: `src/tools/mermaid/MermaidTool.tsx`

Clone PlantUML tool. Differences: parse `parseMermaid`, no include scan, `aria-label="Mermaid source"`, file `accept=".mmd,.mermaid,.md,.markdown,.txt"`, ids `mermaid-file`, default export `MermaidTool`.

- [ ] **Step 1: Write failing UI tests** (same cases as PlantumlTool.test.tsx minus include-error; plus accept attribute)

```ts
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MermaidTool } from '@/tools/mermaid/MermaidTool'
import { renderBlock } from '@/tools/mermaid/render'
import { svgToRaster } from '@/tools/shared/svgToRaster'

vi.mock('@/tools/mermaid/render', () => ({
  renderBlock: vi.fn(async () => {
    throw new Error('engine must not boot in unit tests')
  }),
}))

vi.mock('@/tools/shared/svgToRaster', () => ({
  svgToRaster: vi.fn(),
}))

describe('MermaidTool', () => {
  beforeEach(() => {
    vi.mocked(renderBlock).mockReset()
    vi.mocked(svgToRaster).mockReset()
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mermaid-test'),
      revokeObjectURL: vi.fn(),
    })
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute('open')
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('disables Visualize when the source is empty or whitespace', async () => {
    const user = userEvent.setup()
    render(<MermaidTool />)
    expect(screen.getByRole('button', { name: 'Visualize' })).toBeDisabled()
    await user.type(screen.getByLabelText('Mermaid source'), '   ')
    expect(screen.getByRole('button', { name: 'Visualize' })).toBeDisabled()
  })

  it('accepts mmd and markdown files', () => {
    render(<MermaidTool />)
    const input = document.getElementById('mermaid-file')
    expect(input).toHaveAttribute(
      'accept',
      '.mmd,.mermaid,.md,.markdown,.txt',
    )
  })

  it('downloads PNG via svgToRaster png scale 1', async () => {
    vi.mocked(renderBlock).mockResolvedValue({
      ok: true,
      svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    })
    vi.mocked(svgToRaster).mockResolvedValue(
      new Blob(['png'], { type: 'image/png' }),
    )
    const user = userEvent.setup()
    render(<MermaidTool />)
    await user.type(
      screen.getByLabelText('Mermaid source'),
      'flowchart TD{Enter}  A-->B',
    )
    await user.click(screen.getByRole('button', { name: 'Visualize' }))
    await screen.findByRole('button', { name: 'Download PNG' })
    await user.click(screen.getByRole('button', { name: 'Download PNG' }))
    expect(svgToRaster).toHaveBeenCalledWith(
      '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
      { format: 'png', scale: 1 },
    )
  })

  it('keeps SVG and shows Could not create PNG when raster fails', async () => {
    vi.mocked(renderBlock).mockResolvedValue({
      ok: true,
      svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    })
    vi.mocked(svgToRaster).mockRejectedValue(new Error('remote URL not loaded'))
    const user = userEvent.setup()
    render(<MermaidTool />)
    await user.type(screen.getByLabelText('Mermaid source'), 'flowchart TD')
    await user.click(screen.getByRole('button', { name: 'Visualize' }))
    await user.click(await screen.findByRole('button', { name: 'Download PNG' }))
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Could not create PNG: remote URL not loaded',
    )
    expect(screen.getByRole('button', { name: 'Download SVG' })).toBeEnabled()
  })

  it('opens a lightbox from View and closes it', async () => {
    vi.mocked(renderBlock).mockResolvedValue({
      ok: true,
      svg: '<svg xmlns="http://www.w3.org/2000/svg"><title>drawn</title></svg>',
    })
    const user = userEvent.setup()
    render(<MermaidTool />)
    await user.type(screen.getByLabelText('Mermaid source'), 'flowchart TD')
    await user.click(screen.getByRole('button', { name: 'Visualize' }))
    await user.click(await screen.findByRole('button', { name: 'View' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveTextContent('Diagram 1')
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the lightbox from the preview and leaves PNG download unzoomed', async () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
    vi.mocked(renderBlock).mockResolvedValue({ ok: true, svg })
    vi.mocked(svgToRaster).mockResolvedValue(
      new Blob(['png'], { type: 'image/png' }),
    )
    const user = userEvent.setup()
    render(<MermaidTool />)
    await user.type(screen.getByLabelText('Mermaid source'), 'flowchart TD')
    await user.click(screen.getByRole('button', { name: 'Visualize' }))
    await user.click(
      await screen.findByRole('button', { name: 'View diagram 1' }),
    )
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Download PNG' }))
    expect(svgToRaster).toHaveBeenCalledWith(svg, { format: 'png', scale: 1 })
  })
})
```

- [ ] **Step 2: Run — fail**

```bash
npm test -- testing/unit/tools/mermaid/MermaidTool.test.tsx
```

- [ ] **Step 3: Implement MermaidTool.tsx**

Copy `PlantumlTool.tsx`. Replace:

- `DiagramLightbox` import → `@/tools/shared/DiagramLightbox`
- Drop `formatIncludeError` / include branch; always `renderBlock(block.text, block.startLine)`
- `parsePlantUml` → `parseMermaid`
- Labels/ids/accept as above
- `export default MermaidTool`

`renderBlock` is mocked in tests; the real function lives in `render.ts` which also exports `mapEngineError`. The mock factory must still export only `renderBlock` — tests that import `mapEngineError` are a different file. UI mock of the whole module is OK.

- [ ] **Step 4: Run UI + plantuml tests — pass**

```bash
npm test -- testing/unit/tools/mermaid testing/unit/tools/plantuml
```

- [ ] **Step 5: Commit** — skip unless user asked

---

### Task 6: Registry

**Files:**
- Modify: `src/tools/types.ts`, `src/tools/registry.ts`, `testing/unit/tools/registry.test.ts`

- [ ] **Step 1: Extend registry test expected ids with `'mermaid'`** — run, fail
- [ ] **Step 2: Add `ToolId` union member and registry entry**

```ts
{
  id: 'mermaid',
  title: 'Mermaid',
  description:
    'View .mmd and Mermaid fences in the browser. Nothing is uploaded.',
  component: lazy(() => import('./mermaid/MermaidTool')),
}
```

- [ ] **Step 3: `npm test -- testing/unit/tools/registry.test.ts`** — pass
- [ ] **Step 4: Commit** — skip unless user asked

---

### Task 7: Docs + chunk leak check

**Files:**
- Create: `docs/features/mermaid.md` (mirror `docs/features/plantuml.md` with mermaid rules from the spec)
- Modify: `docs/features/tool-registry.md` — add row `mermaid` | Mermaid; heavy-tools sentence includes Mermaid
- Modify: `docs/README.md` — spec, plan, feature tables
- Modify: `docs/architecture.md` — `Heavy tools (PDF, PlantUML, Mermaid)`
- Modify: `PRODUCT.md` — capabilities + heavy-deps bullet include `mermaid`

- [ ] **Step 1: Write docs as specified**
- [ ] **Step 2: Build and assert mermaid is not in index-referenced chunks**

```bash
npm run build
```

Then a small node check: `index.html` script srcs must not contain mermaid package source. Grep `dist/assets` files linked from `index.html` for `registerIconPacks` / unique mermaid strings like `mermaidAPI` — they must only appear in a lazy chunk not linked from index.

```js
import { readFileSync, readdirSync } from 'node:fs'
const html = readFileSync('dist/index.html', 'utf8')
const assets = [...html.matchAll(/assets\/[^"']+/g)].map((m) => m[0])
const leaked = []
for (const rel of assets) {
  const body = readFileSync('dist/' + rel, 'utf8')
  if (body.includes('mermaidAPI') || /from ['"]mermaid['"]/.test(body)) {
    leaked.push(rel)
  }
}
if (leaked.length) {
  console.error('mermaid leaked into HTML-referenced chunk(s):', leaked)
  process.exit(1)
}
console.log('ok: mermaid not in index chunks')
```

- [ ] **Step 3: Full unit suite**

```bash
npm test
```

Expected: 0 failures.

- [ ] **Step 4: Commit** — skip unless user asked

---

## Spec coverage

| Requirement | Task |
|-------------|------|
| Registry id `mermaid`, title Mermaid, lazy route | 6 |
| Fence parse + whole-buffer fallback | 3 |
| Bundled mermaid, strict, no icon packs, sequential render | 4 |
| PlantUML-clone UI, Visualize, lightbox, SVG+PNG | 5 |
| Shared lightbox/panZoom lift | 1, 2 |
| Docs + heavy chunk | 7 |
| No Kroki/CDN | 4, 7 (privacy unchanged) |

## Out of scope

ELK, KaTeX, icon packs, live render, JPEG, e2e as merge gate, commits unless requested.
