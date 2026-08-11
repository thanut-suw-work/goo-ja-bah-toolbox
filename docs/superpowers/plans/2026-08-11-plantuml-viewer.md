# PlantUML Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a client-only PlantUML tool that pastes or opens one `.puml` buffer, Visualize-renders every `@startuml` block as stacked SVG cards, and downloads SVG + PNG per diagram.

**Architecture:** Pure `parse.ts` splits case-sensitive `@startuml`/`@enduml` blocks and scans includes (never call the engine on a hit). `render.ts` injects bundled `viz-global.js` as a classic script, dynamic-imports `@plantuml/core`, wraps `renderToString` in a Promise, and serializes renders (TeaVM overwrites an in-flight request). `PlantumlTool.tsx` is a stacked Source + Visualize + result cards UI; PNG goes through shared `svgToRaster(svg, { format: 'png', scale: 1 })`. Registry `React.lazy` keeps the engine out of the home/main chunk.

**Tech Stack:** React 19 · Vite · TypeScript · Vitest · `@plantuml/core` ≥ 1.2026.6 (MIT) · existing `ToolLayout` / `IoPanel` / `ActionBar` / Button / Textarea / Input

**Spec:** `docs/superpowers/specs/2026-08-11-plantuml-viewer-design.md`

---

## File map

**Parallel impl note:** Sister plan for SVG to image also patches `src/tools/types.ts`, `src/tools/registry.ts`, `testing/unit/tools/registry.test.ts`, `docs/features/tool-registry.md`, `docs/README.md`, `docs/architecture.md`, and `PRODUCT.md`. Add **`plantuml` only**. If `svg-to-image` is already in those files, keep both ids. Do **not** create `src/tools/shared/svgToRaster.ts`, `src/tools/svg-to-image/**`, `docs/features/svg-to-image.md`, or `testing/unit/tools/shared/**`. If `svgToRaster` is missing when this plan reaches UI/PNG, **STOP** — do not invent a second helper.

**Create:**
```
src/tools/plantuml/parse.ts
src/tools/plantuml/render.ts
src/tools/plantuml/PlantumlTool.tsx
src/tools/plantuml/plantuml-core.d.ts
testing/unit/tools/plantuml/parse.test.ts
testing/unit/tools/plantuml/render.test.ts
testing/unit/tools/plantuml/PlantumlTool.test.tsx
docs/features/plantuml.md
```

**Modify:**
```
package.json                          # "@plantuml/core": "^1.2026.6"
vite.config.ts                        # viz-global alias + optimizeDeps.exclude
src/tools/types.ts                    # ToolId | 'plantuml'
src/tools/registry.ts                 # lazy plantuml entry
testing/unit/tools/registry.test.ts   # expected ids include plantuml
docs/features/tool-registry.md
docs/README.md
docs/architecture.md
PRODUCT.md
```

**Import only (sister-owned):**
```
src/tools/shared/svgToRaster.ts
```

```ts
export type RasterFormat = 'png' | 'jpeg'
export type RasterScale = 1 | 2 | 3

export function svgToRaster(
  svg: string,
  opts: { format: RasterFormat; scale: RasterScale; quality?: number },
): Promise<Blob>
```

PlantUML calls `svgToRaster(svg, { format: 'png', scale: 1 })` only.

**Optional (not a merge gate):**
```
testing/e2e/fixtures/tiny-sequence.puml
testing/e2e/plantuml.spec.ts
```

---

### Task 1: Parse — split `@startuml` blocks

**Files:**
- Create: `testing/unit/tools/plantuml/parse.test.ts`
- Create: `src/tools/plantuml/parse.ts`

- [ ] **Step 1: Write failing block-split tests**

Create `testing/unit/tools/plantuml/parse.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parsePlantUml } from '@/tools/plantuml/parse'

describe('parsePlantUml blocks', () => {
  it('parses one @startuml block', () => {
    const src = ['@startuml', 'Alice -> Bob: hi', '@enduml'].join('\n')
    const blocks = parsePlantUml(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.startLine).toBe(1)
    expect(blocks[0]!.lines).toEqual([
      '@startuml',
      'Alice -> Bob: hi',
      '@enduml',
    ])
  })

  it('parses several blocks in file order', () => {
    const src = [
      '@startuml',
      'A -> B',
      '@enduml',
      '@startuml',
      'C -> D',
      '@enduml',
    ].join('\n')
    const blocks = parsePlantUml(src)
    expect(blocks).toHaveLength(2)
    expect(blocks[0]!.startLine).toBe(1)
    expect(blocks[1]!.startLine).toBe(4)
    expect(blocks[1]!.lines[1]).toBe('C -> D')
  })

  it('treats @startuml id as a start token', () => {
    const src = ['@startuml hello', 'Alice -> Bob', '@enduml'].join('\n')
    const blocks = parsePlantUml(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.lines[0]).toBe('@startuml hello')
  })

  it('uses the whole buffer as one block when there is no @startuml', () => {
    const src = 'Alice -> Bob: hi'
    const blocks = parsePlantUml(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.startLine).toBe(1)
    expect(blocks[0]!.lines).toEqual(['Alice -> Bob: hi'])
  })

  it('emits an unclosed block at EOF', () => {
    const src = ['@startuml', 'Alice -> Bob'].join('\n')
    const blocks = parsePlantUml(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.lines).toEqual(['@startuml', 'Alice -> Bob'])
  })

  it('discards junk between blocks', () => {
    const src = [
      '@startuml',
      'A -> B',
      '@enduml',
      'this is discarded',
      '@startuml',
      'C -> D',
      '@enduml',
    ].join('\n')
    const blocks = parsePlantUml(src)
    expect(blocks).toHaveLength(2)
    expect(blocks.map((b) => b.lines.join('\n')).join('|')).not.toContain(
      'discarded',
    )
    expect(blocks[1]!.startLine).toBe(5)
  })

  it('records startLine of a second block as the file line of its @startuml', () => {
    const src = [
      'preamble',
      '@startuml',
      'A -> B',
      '@enduml',
      '',
      '@startuml',
      'C -> D',
      '@enduml',
    ].join('\n')
    const blocks = parsePlantUml(src)
    expect(blocks[0]!.startLine).toBe(2)
    expect(blocks[1]!.startLine).toBe(6)
  })

  it('is case-sensitive: @STARTUML is not a start token', () => {
    const src = ['@STARTUML', 'Alice -> Bob', '@enduml'].join('\n')
    const blocks = parsePlantUml(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.startLine).toBe(1)
    expect(blocks[0]!.lines[0]).toBe('@STARTUML')
  })

  it('does not treat @startumlfoo as a start token', () => {
    const src = ['@startumlfoo', 'Alice -> Bob'].join('\n')
    const blocks = parsePlantUml(src)
    expect(blocks).toHaveLength(1)
    expect(blocks[0]!.lines[0]).toBe('@startumlfoo')
  })

  it('starts a new block if @startuml appears while the previous is unclosed', () => {
    const src = ['@startuml', 'A -> B', '@startuml', 'C -> D', '@enduml'].join(
      '\n',
    )
    const blocks = parsePlantUml(src)
    expect(blocks).toHaveLength(2)
    expect(blocks[0]!.lines).toEqual(['@startuml', 'A -> B'])
    expect(blocks[1]!.startLine).toBe(3)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- testing/unit/tools/plantuml/parse.test.ts
```

Expected: FAIL (module not found / `parsePlantUml` missing).

- [ ] **Step 3: Implement block splitting**

Create `src/tools/plantuml/parse.ts`:

```ts
export type IncludeKind = 'path' | 'stdlib'

export type IncludeHit = {
  fileLine: number
  quoted: string
  kind: IncludeKind
}

export type ParsedBlock = {
  startLine: number
  lines: string[]
  includeHit: IncludeHit | null
}

function splitLines(source: string): string[] {
  return source.split(/\r\n|\r|\n/)
}

function isDelimLine(line: string, token: string): boolean {
  const t = line.trim()
  if (!t.startsWith(token)) return false
  const next = t.charAt(token.length)
  return next === '' || !/[A-Za-z0-9_]/.test(next)
}

function isStartUml(line: string): boolean {
  return isDelimLine(line, '@startuml')
}

function isEndUml(line: string): boolean {
  return isDelimLine(line, '@enduml')
}

function makeBlock(lines: string[], startLine: number): ParsedBlock {
  return { startLine, lines, includeHit: null }
}

export function parsePlantUml(source: string): ParsedBlock[] {
  const raw = splitLines(source)
  if (!raw.some(isStartUml)) {
    return [makeBlock(raw, 1)]
  }

  const blocks: ParsedBlock[] = []
  let current: { startLine: number; lines: string[] } | null = null

  for (let i = 0; i < raw.length; i++) {
    const line = raw[i]!
    const fileLine = i + 1
    if (isStartUml(line)) {
      if (current) {
        blocks.push(makeBlock(current.lines, current.startLine))
      }
      current = { startLine: fileLine, lines: [line] }
      continue
    }
    if (!current) continue
    current.lines.push(line)
    if (isEndUml(line)) {
      blocks.push(makeBlock(current.lines, current.startLine))
      current = null
    }
  }

  if (current) {
    blocks.push(makeBlock(current.lines, current.startLine))
  }
  return blocks
}

export function formatIncludeError(hit: IncludeHit): string {
  if (hit.kind === 'stdlib') {
    return `Line ${hit.fileLine}: ${hit.quoted} — stdlib not bundled. Inline what you need or remove the include.`
  }
  return `Line ${hit.fileLine}: ${hit.quoted} — this tool renders one file. Paste included contents into this diagram or remove the include.`
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- testing/unit/tools/plantuml/parse.test.ts
```

Expected: PASS (block-split tests).

- [ ] **Step 5: Commit**

```bash
git add src/tools/plantuml/parse.ts testing/unit/tools/plantuml/parse.test.ts
git commit -m "$(cat <<'EOF'
feat(plantuml): split startuml blocks

EOF
)"
```

---

### Task 2: Parse — include scan + exact error copy

**Files:**
- Modify: `testing/unit/tools/plantuml/parse.test.ts`
- Modify: `src/tools/plantuml/parse.ts`

- [ ] **Step 1: Write failing include-scan tests**

Append to `testing/unit/tools/plantuml/parse.test.ts`:

```ts
import { formatIncludeError } from '@/tools/plantuml/parse'

describe('parsePlantUml include scan', () => {
  it('hits !include path with file line and path error copy', () => {
    const src = [
      '@startuml',
      'Alice -> Bob',
      '!include common.puml',
      '@enduml',
    ].join('\n')
    const blocks = parsePlantUml(src)
    expect(blocks[0]!.includeHit).toEqual({
      fileLine: 3,
      quoted: '!include common.puml',
      kind: 'path',
    })
    expect(formatIncludeError(blocks[0]!.includeHit!)).toBe(
      'Line 3: !include common.puml — this tool renders one file. Paste included contents into this diagram or remove the include.',
    )
  })

  it('hits stdlib angle-bracket include with stdlib error copy', () => {
    const src = [
      '@startuml',
      '!include <c4/C4_Container>',
      'A -> B',
      '@enduml',
    ].join('\n')
    const hit = parsePlantUml(src)[0]!.includeHit
    expect(hit).toEqual({
      fileLine: 2,
      quoted: '!include <c4/C4_Container>',
      kind: 'stdlib',
    })
    expect(formatIncludeError(hit!)).toBe(
      'Line 2: !include <c4/C4_Container> — stdlib not bundled. Inline what you need or remove the include.',
    )
  })

  it('hits !includeurl, !import, !include_once, !includesub, !include_many', () => {
    const kinds = [
      '!includeurl https://example.com/x.puml',
      '!import foo.puml',
      '!include_once once.puml',
      '!includesub lib.puml!SUB',
      '!include_many many.puml',
    ]
    for (const directiveLine of kinds) {
      const src = ['@startuml', directiveLine, '@enduml'].join('\n')
      const hit = parsePlantUml(src)[0]!.includeHit
      expect(hit, directiveLine).not.toBeNull()
      expect(hit!.kind).toBe('path')
      expect(hit!.fileLine).toBe(2)
      expect(hit!.quoted).toBe(directiveLine)
    }
  })

  it('is case-insensitive for the include prefix and quotes the line as written', () => {
    const src = ['@startuml', '!INCLUDE common.puml', '@enduml'].join('\n')
    const hit = parsePlantUml(src)[0]!.includeHit
    expect(hit!.quoted).toBe('!INCLUDE common.puml')
    expect(hit!.kind).toBe('path')
  })

  it('does not treat a \' commented include as a hit', () => {
    const src = [
      '@startuml',
      "' !include common.puml",
      'Alice -> Bob',
      '@enduml',
    ].join('\n')
    expect(parsePlantUml(src)[0]!.includeHit).toBeNull()
  })

  it('still hits an include inside a block comment (known scanner limit)', () => {
    const src = [
      '@startuml',
      "/'",
      '!include common.puml',
      "'/",
      'Alice -> Bob',
      '@enduml',
    ].join('\n')
    expect(parsePlantUml(src)[0]!.includeHit?.fileLine).toBe(3)
  })

  it('uses file line numbers for an include in a second block', () => {
    const src = [
      '@startuml',
      'A -> B',
      '@enduml',
      '@startuml',
      '!include other.puml',
      '@enduml',
    ].join('\n')
    expect(parsePlantUml(src)[1]!.includeHit?.fileLine).toBe(5)
  })

  it('matches the spec Line 4 path-include sentence', () => {
    const src = [
      '@startuml',
      'A -> B',
      'C -> D',
      '!include common.puml',
      '@enduml',
    ].join('\n')
    const hit = parsePlantUml(src)[0]!.includeHit
    expect(formatIncludeError(hit!)).toBe(
      'Line 4: !include common.puml — this tool renders one file. Paste included contents into this diagram or remove the include.',
    )
  })

  it('matches the spec Line 4 stdlib sentence', () => {
    const src = [
      '@startuml',
      'A -> B',
      'C -> D',
      '!include <c4/C4_Container>',
      '@enduml',
    ].join('\n')
    const hit = parsePlantUml(src)[0]!.includeHit
    expect(formatIncludeError(hit!)).toBe(
      'Line 4: !include <c4/C4_Container> — stdlib not bundled. Inline what you need or remove the include.',
    )
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- testing/unit/tools/plantuml/parse.test.ts
```

Expected: FAIL (`includeHit` is always `null`).

- [ ] **Step 3: Implement include scan**

Replace the entire contents of `src/tools/plantuml/parse.ts` with:

```ts
export type IncludeKind = 'path' | 'stdlib'

export type IncludeHit = {
  fileLine: number
  quoted: string
  kind: IncludeKind
}

export type ParsedBlock = {
  startLine: number
  lines: string[]
  includeHit: IncludeHit | null
}

function splitLines(source: string): string[] {
  return source.split(/\r\n|\r|\n/)
}

function isDelimLine(line: string, token: string): boolean {
  const t = line.trim()
  if (!t.startsWith(token)) return false
  const next = t.charAt(token.length)
  return next === '' || !/[A-Za-z0-9_]/.test(next)
}

function isStartUml(line: string): boolean {
  return isDelimLine(line, '@startuml')
}

function isEndUml(line: string): boolean {
  return isDelimLine(line, '@enduml')
}

function scanInclude(lines: string[], startLine: number): IncludeHit | null {
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i]!.trim()
    if (trimmed.startsWith("'")) continue
    const lower = trimmed.toLowerCase()
    if (!(lower.startsWith('!import') || lower.startsWith('!include'))) {
      continue
    }
    const m = trimmed.match(/^(!include\S*|!import)(?:\s+(\S+))?/i)
    const directive = m?.[1] ?? trimmed
    const includePath = m?.[2] ?? ''
    const quoted = includePath ? `${directive} ${includePath}` : directive
    const kind: IncludeKind =
      includePath.startsWith('<') && includePath.endsWith('>')
        ? 'stdlib'
        : 'path'
    return { fileLine: startLine + i, quoted, kind }
  }
  return null
}

function makeBlock(lines: string[], startLine: number): ParsedBlock {
  return { startLine, lines, includeHit: scanInclude(lines, startLine) }
}

export function parsePlantUml(source: string): ParsedBlock[] {
  const raw = splitLines(source)
  if (!raw.some(isStartUml)) {
    return [makeBlock(raw, 1)]
  }

  const blocks: ParsedBlock[] = []
  let current: { startLine: number; lines: string[] } | null = null

  for (let i = 0; i < raw.length; i++) {
    const line = raw[i]!
    const fileLine = i + 1
    if (isStartUml(line)) {
      if (current) {
        blocks.push(makeBlock(current.lines, current.startLine))
      }
      current = { startLine: fileLine, lines: [line] }
      continue
    }
    if (!current) continue
    current.lines.push(line)
    if (isEndUml(line)) {
      blocks.push(makeBlock(current.lines, current.startLine))
      current = null
    }
  }

  if (current) {
    blocks.push(makeBlock(current.lines, current.startLine))
  }
  return blocks
}

export function formatIncludeError(hit: IncludeHit): string {
  if (hit.kind === 'stdlib') {
    return `Line ${hit.fileLine}: ${hit.quoted} — stdlib not bundled. Inline what you need or remove the include.`
  }
  return `Line ${hit.fileLine}: ${hit.quoted} — this tool renders one file. Paste included contents into this diagram or remove the include.`
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- testing/unit/tools/plantuml/parse.test.ts
```

Expected: PASS (block + include suites).

- [ ] **Step 5: Commit**

```bash
git add src/tools/plantuml/parse.ts testing/unit/tools/plantuml/parse.test.ts
git commit -m "$(cat <<'EOF'
feat(plantuml): detect include directives

EOF
)"
```

---

### Task 3: Pin `@plantuml/core` ≥ 1.2026.6 + Vite viz wiring

**Files:**
- Modify: `package.json` (via npm)
- Modify: `vite.config.ts`
- Create: `src/tools/plantuml/plantuml-core.d.ts`

- [ ] **Step 1: Install MIT engine**

```bash
npm install @plantuml/core@^1.2026.6
```

Then confirm license and floor version:

```bash
node -e "const p=JSON.parse(require('fs').readFileSync('node_modules/@plantuml/core/package.json','utf8')); if (p.license !== 'MIT') { console.error('refusing non-MIT', p.license); process.exit(1) } const parts=p.version.split('.').map(Number); if (parts[0]<1 || (parts[0]===1 && parts[1]<2026) || (parts[0]===1 && parts[1]===2026 && parts[2]<6)) { console.error('version too old or GPL-era', p.version); process.exit(1) } console.log('ok', p.version, p.license)"
```

Expected: `ok 1.2026.6 MIT` (or a later `1.2026.x` / `1.y` that is still MIT). Do **not** install `1.2026.5` (GPL).

`package.json` dependencies must contain:

```json
"@plantuml/core": "^1.2026.6"
```

- [ ] **Step 2: Add module types**

Create `src/tools/plantuml/plantuml-core.d.ts`:

```ts
declare module '@plantuml/core' {
  export function render(
    lines: string[],
    targetId: string,
    options?: { dark?: boolean },
  ): void
  export function renderToString(
    lines: string[],
    onSuccess: (svg: string) => void,
    onError: (message: string) => void,
  ): void
}

declare module '@plantuml/core/plantuml.js' {
  export function render(
    lines: string[],
    targetId: string,
    options?: { dark?: boolean },
  ): void
  export function renderToString(
    lines: string[],
    onSuccess: (svg: string) => void,
    onError: (message: string) => void,
  ): void
}
```

Package `exports` (1.2026.6): `"."` and `"./plantuml.js"` → `plantuml.js`; `"./viz-global.js"` → `viz-global.js`. Do not import `emoji.js` / `openiconic.js`. Do not call `render()` (DOM). Do not pass `{ dark: true }`.

- [ ] **Step 3: Vite alias + exclude from dep optimizer**

Replace `vite.config.ts` with:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Fallback if the package export map ever blocks `?url` resolution.
      '@plantuml/core/viz-global.js': path.resolve(
        __dirname,
        'node_modules/@plantuml/core/viz-global.js',
      ),
    },
  },
  optimizeDeps: {
    exclude: ['@plantuml/core'],
  },
})
```

Task 4 loads viz with `import('@plantuml/core/viz-global.js?url')`. The alias above makes that specifier always resolve to `node_modules/@plantuml/core/viz-global.js`, even if the package export map blocks `?url`. Do not load unpkg/jsDelivr.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/tools/plantuml/plantuml-core.d.ts
git commit -m "$(cat <<'EOF'
chore(plantuml): add MIT engine and viz

EOF
)"
```

---

### Task 4: `render.ts` — Promise API, sequential queue, file line mapping

**Files:**
- Create: `testing/unit/tools/plantuml/render.test.ts`
- Create: `src/tools/plantuml/render.ts`

Unit tests **must not** call `loadEngine` or `renderBlock` (no TeaVM / WASM / viz script). Only `mapEngineError`.

- [ ] **Step 1: Write failing mapper tests**

Create `testing/unit/tools/plantuml/render.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { mapEngineError } from '@/tools/plantuml/render'

describe('mapEngineError', () => {
  it('returns the raw message when no line number is present', () => {
    expect(mapEngineError('Syntax Error?', 10)).toEqual({
      error: 'Syntax Error?',
      line: null,
    })
  })

  it('maps a block-relative line onto the file line', () => {
    // engine line 3, block starts at file line 10 → file line 12
    const r = mapEngineError('Error line 3 in diagram', 10)
    expect(r.line).toBe(12)
    expect(r.error).toBe('Line 12: Error line 12 in diagram')
  })

  it('keeps engine line = file line when startLine is 1 (no-marker block)', () => {
    const r = mapEngineError('Error line 4', 1)
    expect(r.line).toBe(4)
    expect(r.error).toBe('Line 4: Error line 4')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- testing/unit/tools/plantuml/render.test.ts
```

Expected: FAIL (module not found / `mapEngineError` missing).

- [ ] **Step 3: Implement `render.ts`**

Create `src/tools/plantuml/render.ts`:

```ts
export type EngineRenderResult =
  | { ok: true; svg: string }
  | { ok: false; error: string; line: number | null }

type RenderToString = (
  lines: string[],
  onSuccess: (svg: string) => void,
  onError: (message: string) => void,
) => void

type Engine = {
  renderToString: RenderToString
}

export function mapEngineError(
  message: string,
  startLine: number,
): { error: string; line: number | null } {
  const m = message.match(/line\s+(\d+)/i)
  if (!m) return { error: message, line: null }
  const engineLine = Number.parseInt(m[1]!, 10)
  const fileLine = engineLine + startLine - 1
  const rewritten = message.replace(/line\s+\d+/i, `line ${fileLine}`)
  return { error: `Line ${fileLine}: ${rewritten}`, line: fileLine }
}

let vizReady = false
let enginePromise: Promise<Engine> | null = null
let queue: Promise<unknown> = Promise.resolve()

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job)
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function injectClassicScript(src: string): Promise<void> {
  if (vizReady) return Promise.resolve()
  const existing = document.querySelector('script[data-plantuml-viz="1"]')
  if (existing) {
    vizReady = true
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const el = document.createElement('script')
    el.src = src
    el.async = false
    el.setAttribute('data-plantuml-viz', '1')
    el.onload = () => {
      vizReady = true
      resolve()
    }
    el.onerror = () => {
      el.remove()
      reject(new Error('Failed to load Graphviz (viz-global.js)'))
    }
    document.head.appendChild(el)
  })
}

async function loadEngineOnce(): Promise<Engine> {
  // Bundled URL from our static host (Pages base path included). Never a CDN.
  const vizMod = await import('@plantuml/core/viz-global.js?url')
  const vizUrl = vizMod.default
  await injectClassicScript(vizUrl)
  const core = await import('@plantuml/core/plantuml.js')
  return { renderToString: core.renderToString }
}

export function loadEngine(): Promise<Engine> {
  if (!enginePromise) {
    enginePromise = loadEngineOnce().catch((err: unknown) => {
      enginePromise = null
      throw err
    })
  }
  return enginePromise
}

function renderToStringP(
  renderToString: RenderToString,
  lines: string[],
): Promise<string> {
  return new Promise((resolve, reject) => {
    renderToString(
      lines,
      (svg) => resolve(svg),
      (message) => reject(new Error(message)),
    )
  })
}

/**
 * Sequential on purpose: TeaVM renderToString overwrites a previous
 * in-flight request. Never parallelize.
 */
export function renderBlock(
  lines: string[],
  startLine: number,
): Promise<EngineRenderResult> {
  return enqueue(async () => {
    const engine = await loadEngine()
    try {
      const svg = await renderToStringP(engine.renderToString, lines)
      return { ok: true as const, svg }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      const mapped = mapEngineError(message, startLine)
      return { ok: false as const, error: mapped.error, line: mapped.line }
    }
  })
}
```

`loadEngine` / script inject / `import('@plantuml/core/plantuml.js')` run only when `renderBlock` is called (first Visualize). `mapEngineError` has no engine import at module top level, so parse/mapper unit tests never boot `@plantuml/core`.

If TypeScript cannot resolve `@plantuml/core/viz-global.js?url`, keep the Vite alias from Task 3 (`@plantuml/core/viz-global.js` → the file in `node_modules`). `vite/client` already types `*?url`.

- [ ] **Step 4: Run mapper tests — expect PASS**

```bash
npm test -- testing/unit/tools/plantuml/render.test.ts testing/unit/tools/plantuml/parse.test.ts
```

Expected: PASS. `loadEngine` is never invoked.

- [ ] **Step 5: Commit**

```bash
git add src/tools/plantuml/render.ts testing/unit/tools/plantuml/render.test.ts
git commit -m "$(cat <<'EOF'
feat(plantuml): wrap renderToString queue

EOF
)"
```

---

### Task 5: `PlantumlTool` stacked UI + downloads

**Files:**
- Create: `testing/unit/tools/plantuml/PlantumlTool.test.tsx`
- Create: `src/tools/plantuml/PlantumlTool.tsx`

**STOP gate (do this first):**

```bash
test -f src/tools/shared/svgToRaster.ts || { echo 'STOP: src/tools/shared/svgToRaster.ts missing. Sister plan owns it. Do not invent a second helper.'; exit 1; }
```

If that file is missing, **stop this task**. Do not copy canvas code into `plantuml/`. Resume when the sister helper exists with the signature in the File map.

- [ ] **Step 1: Write failing cheap UI tests**

Create `testing/unit/tools/plantuml/PlantumlTool.test.tsx`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlantumlTool } from '@/tools/plantuml/PlantumlTool'
import { renderBlock } from '@/tools/plantuml/render'
import { svgToRaster } from '@/tools/shared/svgToRaster'

vi.mock('@/tools/plantuml/render', () => ({
  renderBlock: vi.fn(async () => {
    throw new Error('engine must not boot in unit tests')
  }),
}))

vi.mock('@/tools/shared/svgToRaster', () => ({
  svgToRaster: vi.fn(),
}))

describe('PlantumlTool', () => {
  beforeEach(() => {
    vi.mocked(renderBlock).mockReset()
    vi.mocked(svgToRaster).mockReset()
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:plantuml-test'),
      revokeObjectURL: vi.fn(),
    })
  })

  it('disables Visualize when the source is empty or whitespace', async () => {
    const user = userEvent.setup()
    render(<PlantumlTool />)
    const button = screen.getByRole('button', { name: 'Visualize' })
    expect(button).toBeDisabled()
    await user.type(screen.getByLabelText('PlantUML source'), '   ')
    expect(screen.getByRole('button', { name: 'Visualize' })).toBeDisabled()
  })

  it('shows include error copy without calling the engine', async () => {
    const user = userEvent.setup()
    render(<PlantumlTool />)
    await user.type(
      screen.getByLabelText('PlantUML source'),
      '@startuml{Enter}!include common.puml{Enter}@enduml',
    )
    await user.click(screen.getByRole('button', { name: 'Visualize' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(
      'Line 2: !include common.puml — this tool renders one file. Paste included contents into this diagram or remove the include.',
    )
    expect(renderBlock).not.toHaveBeenCalled()
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
    render(<PlantumlTool />)
    await user.type(
      screen.getByLabelText('PlantUML source'),
      '@startuml{Enter}Alice -> Bob{Enter}@enduml',
    )
    await user.click(screen.getByRole('button', { name: 'Visualize' }))
    await screen.findByRole('button', { name: 'Download PNG' })
    await user.click(screen.getByRole('button', { name: 'Download PNG' }))
    expect(svgToRaster).toHaveBeenCalledWith(
      '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
      { format: 'png', scale: 1 },
    )
    expect(svgToRaster).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ format: 'jpeg' }),
    )
  })

  it('keeps SVG and shows Could not create PNG when raster fails', async () => {
    vi.mocked(renderBlock).mockResolvedValue({
      ok: true,
      svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>',
    })
    vi.mocked(svgToRaster).mockRejectedValue(new Error('remote URL not loaded'))
    const user = userEvent.setup()
    render(<PlantumlTool />)
    await user.type(
      screen.getByLabelText('PlantUML source'),
      '@startuml{Enter}A -> B{Enter}@enduml',
    )
    await user.click(screen.getByRole('button', { name: 'Visualize' }))
    await user.click(await screen.findByRole('button', { name: 'Download PNG' }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe(
      'Could not create PNG: remote URL not loaded',
    )
    expect(
      screen.getByRole('button', { name: 'Download SVG' }),
    ).toBeEnabled()
  })
})
```

If `vi.mock('@/tools/plantuml/render')` does not intercept `./render` inside the component, change the mock module id to the resolved file `src/tools/plantuml/render.ts` (Vitest treats them as one module once the alias matches). Same for `svgToRaster`.

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- testing/unit/tools/plantuml/PlantumlTool.test.tsx
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement `PlantumlTool.tsx`**

Do **not** wrap `ToolLayout` here — `src/app/ToolPage.tsx` already wraps the lazy component with registry `title` / `description`. Do **not** use `IoGrid`. No JPEG controls. No dark-diagram toggle. No toasts.

Create `src/tools/plantuml/PlantumlTool.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ActionBar, IoPanel } from '@/tools/shared/IoPanels'
import { svgToRaster } from '@/tools/shared/svgToRaster'
import { formatIncludeError, parsePlantUml } from './parse'
import { renderBlock } from './render'

export type DiagramResult =
  | { ok: true; svg: string; pngError: string | null }
  | { ok: false; error: string }

function stemOf(fileName: string): string {
  const base = fileName.replace(/^.*[/\\]/, '')
  const dot = base.lastIndexOf('.')
  if (dot <= 0) return base.length > 0 ? base : 'diagram'
  const stem = base.slice(0, dot)
  return stem.length > 0 ? stem : 'diagram'
}

function triggerBlobDownload(blob: Blob, filename: string): string {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  return url
}

export function PlantumlTool() {
  const [source, setSource] = useState('')
  const [filename, setFilename] = useState<string | null>(null)
  const [stem, setStem] = useState('diagram')
  const [readError, setReadError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<DiagramResult[]>([])
  const [pngBusy, setPngBusy] = useState<Set<number>>(() => new Set())
  const [fatal, setFatal] = useState<Error | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingUrlsRef = useRef<Set<string>>(new Set())
  const aliveRef = useRef(true)

  useEffect(() => {
    aliveRef.current = true
    const pendingUrls = pendingUrlsRef.current
    return () => {
      aliveRef.current = false
      for (const url of pendingUrls) URL.revokeObjectURL(url)
      pendingUrls.clear()
    }
  }, [])

  if (fatal) throw fatal

  function registerUrl(url: string) {
    pendingUrlsRef.current.add(url)
    setTimeout(() => {
      if (pendingUrlsRef.current.delete(url)) URL.revokeObjectURL(url)
    }, 1000)
  }

  function revokeAll() {
    for (const url of pendingUrlsRef.current) URL.revokeObjectURL(url)
    pendingUrlsRef.current.clear()
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setReadError(null)
    try {
      const text = await file.text()
      setSource(text)
      setFilename(file.name)
      setStem(stemOf(file.name))
      setResults([])
      revokeAll()
    } catch {
      setReadError('Could not read file')
    }
  }

  function onClear() {
    setSource('')
    setFilename(null)
    setStem('diagram')
    setReadError(null)
    setResults([])
    setPngBusy(new Set())
    revokeAll()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function onVisualize() {
    if (!source.trim() || busy) return
    revokeAll()
    setResults([])
    setPngBusy(new Set())
    setBusy(true)
    try {
      const blocks = parsePlantUml(source)
      const acc: DiagramResult[] = []
      for (const block of blocks) {
        if (block.includeHit) {
          acc.push({ ok: false, error: formatIncludeError(block.includeHit) })
        } else {
          const r = await renderBlock(block.lines, block.startLine)
          acc.push(
            r.ok
              ? { ok: true, svg: r.svg, pngError: null }
              : { ok: false, error: r.error },
          )
        }
        if (aliveRef.current) setResults([...acc])
      }
    } catch (e) {
      if (aliveRef.current) {
        setFatal(e instanceof Error ? e : new Error(String(e)))
      }
    } finally {
      if (aliveRef.current) setBusy(false)
    }
  }

  function onDownloadSvg(index: number, svg: string) {
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    registerUrl(triggerBlobDownload(blob, `${stem}-${index + 1}.svg`))
  }

  async function onDownloadPng(index: number, svg: string) {
    setPngBusy((prev) => {
      const next = new Set(prev)
      next.add(index)
      return next
    })
    try {
      const blob = await svgToRaster(svg, { format: 'png', scale: 1 })
      registerUrl(triggerBlobDownload(blob, `${stem}-${index + 1}.png`))
      if (!aliveRef.current) return
      setResults((prev) =>
        prev.map((r, i) => (i === index && r.ok ? { ...r, pngError: null } : r)),
      )
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e)
      if (!aliveRef.current) return
      setResults((prev) =>
        prev.map((r, i) =>
          i === index && r.ok
            ? { ...r, pngError: `Could not create PNG: ${detail}` }
            : r,
        ),
      )
    } finally {
      if (!aliveRef.current) return
      setPngBusy((prev) => {
        const next = new Set(prev)
        next.delete(index)
        return next
      })
    }
  }

  const visualizeDisabled = busy || source.trim().length === 0

  return (
    <div className="space-y-6">
      <IoPanel
        title="Source"
        actions={
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            <Trash2 /> Clear
          </Button>
        }
      >
        <div className="space-y-3 border-b p-4">
          <Label htmlFor="plantuml-file" className="text-muted-foreground">
            Open file
          </Label>
          <Input
            id="plantuml-file"
            ref={fileInputRef}
            type="file"
            accept=".puml,.plantuml,.iuml,.wsd,.txt"
            className="max-w-xs cursor-pointer"
            onChange={onFileChange}
          />
          {filename ? (
            <p className="text-sm font-medium text-foreground">{filename}</p>
          ) : null}
          {readError ? (
            <p role="alert" className="text-sm text-destructive">
              {readError}
            </p>
          ) : null}
        </div>
        <Textarea
          aria-label="PlantUML source"
          className="min-h-[300px] resize-none rounded-none border-0 font-mono focus-visible:ring-0 focus-visible:ring-offset-0"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
      </IoPanel>

      <ActionBar>
        <Button type="button" onClick={onVisualize} disabled={visualizeDisabled}>
          {busy ? 'Visualizing…' : 'Visualize'}
        </Button>
      </ActionBar>

      {results.map((result, index) => (
        <IoPanel
          key={index}
          title={`Diagram ${index + 1}`}
          actions={
            result.ok ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onDownloadSvg(index, result.svg)}
                >
                  <Download /> Download SVG
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pngBusy.has(index)}
                  onClick={() => onDownloadPng(index, result.svg)}
                >
                  <Download /> Download PNG
                </Button>
              </>
            ) : null
          }
        >
          {result.ok ? (
            <>
              <div
                className="overflow-auto p-4"
                dangerouslySetInnerHTML={{ __html: result.svg }}
              />
              {result.pngError ? (
                <p role="alert" className="px-4 pb-4 text-sm text-destructive">
                  {result.pngError}
                </p>
              ) : null}
            </>
          ) : (
            <p role="alert" className="p-4 text-sm text-destructive">
              {result.error}
            </p>
          )}
        </IoPanel>
      ))}
    </div>
  )
}

export default PlantumlTool
```

Behavior locked by this file:

- Visualize disabled when empty/whitespace or in flight; label **Visualizing…** (includes first engine load).
- Visualize clears previous results + object URLs before the new run (no stale SVG).
- Include hit → `formatIncludeError`, **never** `renderBlock`.
- Blocks `await`ed one-by-one; `renderBlock` also queues internally.
- Engine load throw → `setFatal` → existing `ToolErrorBoundary` reload UI.
- One block fail → that card `role="alert"`; later/earlier cards still render.
- PNG fail → SVG + Download SVG remain; alert `Could not create PNG: …`.
- Stem = basename without extension of last successful file read; paste-only / Clear → `diagram`; edit-after-pick keeps stem.
- Downloads `{stem}-{n}.svg` / `{stem}-{n}.png`.
- Unmount / Clear / new Visualize / new file pick revoke object URLs.
- File read failure copy is exactly `Could not read file`.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- testing/unit/tools/plantuml/PlantumlTool.test.tsx testing/unit/tools/plantuml/parse.test.ts testing/unit/tools/plantuml/render.test.ts
```

Expected: PASS. `renderBlock` mock never loads `@plantuml/core`.

- [ ] **Step 5: Commit**

```bash
git add src/tools/plantuml/PlantumlTool.tsx testing/unit/tools/plantuml/PlantumlTool.test.tsx
git commit -m "$(cat <<'EOF'
feat(plantuml): add stacked visualize UI

EOF
)"
```

---

### Task 6: Register `plantuml` (lazy)

**Files:**
- Modify: `testing/unit/tools/registry.test.ts`
- Modify: `src/tools/types.ts`
- Modify: `src/tools/registry.ts`

- [ ] **Step 1: Update registry test (fail first)**

In `testing/unit/tools/registry.test.ts`, replace the third test. Do **not** use the phrase “exactly eight”. If `svg-to-image` is already registered, keep it via `allowedExtra`:

```ts
  it('exposes the expected registered tool ids', () => {
    const expected = [
      'json-formatter',
      'base64',
      'uuid',
      'hash-sha256',
      'unix-timestamp',
      'text-case',
      'pdf-to-image',
      'utf-encoding',
      'plantuml',
    ]
    const ids = tools.map((t) => t.id)
    for (const id of expected) {
      expect(ids).toContain(id)
    }
    const allowedExtra = new Set(['svg-to-image'])
    for (const id of ids) {
      expect(expected.includes(id) || allowedExtra.has(id)).toBe(true)
    }
  })
```

- [ ] **Step 2: Run registry test — expect FAIL**

```bash
npm test -- testing/unit/tools/registry.test.ts
```

Expected: FAIL (missing `plantuml`) unless this branch already registered it.

- [ ] **Step 3: Add `ToolId` + lazy registry entry**

`src/tools/types.ts` — add `| 'plantuml'` to `ToolId` (do not remove `svg-to-image` if sister already added it):

```ts
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
```

`src/tools/registry.ts` — append **before** the closing `]` of `tools` (after `utf-encoding`, or after `svg-to-image` if that entry already exists):

```ts
  {
    id: 'plantuml',
    title: 'PlantUML',
    description:
      'View .puml diagrams in the browser. Nothing is uploaded.',
    component: lazy(() => import('./plantuml/PlantumlTool')),
  },
```

Route is `/tools/plantuml` via existing `ToolPage`. `React.lazy` is what keeps `@plantuml/core` out of the home bundle.

- [ ] **Step 4: Run registry + plantuml unit tests — expect PASS**

```bash
npm test -- testing/unit/tools/registry.test.ts testing/unit/tools/plantuml/
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/types.ts src/tools/registry.ts testing/unit/tools/registry.test.ts
git commit -m "$(cat <<'EOF'
feat(plantuml): register lazy plantuml tool

EOF
)"
```

---

### Task 7: Feature docs + product/architecture index

**Files:**
- Create: `docs/features/plantuml.md`
- Modify: `docs/features/tool-registry.md`
- Modify: `docs/README.md`
- Modify: `docs/architecture.md`
- Modify: `PRODUCT.md`

Do **not** add `docs/features/svg-to-image.md`. Do **not** change `docs/privacy.md` (static JS/WASM already allowed as host assets). Merge registry/docs rows with the sister plan: add PlantUML lines only.

- [ ] **Step 1: Write `docs/features/plantuml.md`**

Create `docs/features/plantuml.md`:

```md
# Feature: PlantUML

**Registry id:** `plantuml` · Route: `/tools/plantuml`

## Purpose

View PlantUML source in the browser. Paste or open one file, click **Visualize**, see every `@startuml`…`@enduml` block as a stacked SVG card. Download SVG and PNG per diagram. Nothing is uploaded. No `plantuml.com` / Kroki.

## Behavior

- Source: file picker (`accept=".puml,.plantuml,.iuml,.wsd,.txt"`) **or** textarea paste/edit; one buffer. Pick replaces textarea (UTF-8). Filename shown after a successful pick.
- **Clear**: empty text, drop filename/stem, wipe results, revoke object URLs.
- Unreadable file → source-card `Could not read file`.
- **Visualize** (not live): disabled when source is empty/whitespace or a run is in flight. Label **Visualizing…** while busy (includes first engine load). Clears previous results first.
- Layout: stacked full-width `IoPanel` Source + `ActionBar` + one result card per block. **Not** `IoGrid`. No JPEG/quality/scale/dark controls.
- Success card: heading `Diagram N`, inline SVG (`overflow: auto`), **Download SVG** + **Download PNG**.
- Filenames: `{stem}-{n}.svg` / `{stem}-{n}.png`. `stem` = basename without extension of the last successfully read file; paste-only or after Clear → `diagram`. Editing after a pick keeps the stem until Clear or a new pick.
- Failure: that card only, `role="alert"`; siblings unchanged.
- PNG raster fail: keep SVG + SVG download; `Could not create PNG: …`. PNG button disabled while that card rasterizes.
- Includes (`!include*` prefix or `!import`, case-insensitive, skip `'` comments, block comments not stripped): skip engine for that block; path vs stdlib (`<…>`) copy from the design spec.
- `@startuml` / `@enduml` are case-sensitive. No `@startuml` → one block = whole textarea. Unclosed block at EOF is still emitted. Text between blocks is discarded. Other `@start*` delimiters are not split points.

## Engine

- npm `@plantuml/core` ≥ 1.2026.6 (MIT). Classic-script inject of bundled `viz-global.js`, then dynamic import of `plantuml.js`. `renderToString` wrapped as a Promise. Sequential queue (TeaVM overwrites in-flight work).
- Lazy chunk: only `/tools/plantuml` downloads the engine. No CDN at runtime.
- Shared PNG: `svgToRaster(svg, { format: 'png', scale: 1 })` from `src/tools/shared/svgToRaster.ts` (owned by the SVG to image tool). This tool must not reimplement rasterization.

## Privacy

See `docs/privacy.md`. File API → memory only. No include fetches. Engine files are static host assets after Vite build. Revoke object URLs on unmount (PDF pattern).

## Tests

- Unit gate: `testing/unit/tools/plantuml/parse.test.ts` (do **not** boot `@plantuml/core`).
- Mapper: `testing/unit/tools/plantuml/render.test.ts` (`mapEngineError` only).
- Cheap UI: `testing/unit/tools/plantuml/PlantumlTool.test.tsx` with `render` / `svgToRaster` mocked.
- Optional e2e fixture is not the merge gate.
```

- [ ] **Step 2: Patch index docs**

`docs/features/tool-registry.md` — add a row to **Registered tools** (keep `svg-to-image` if already present):

```md
| `plantuml` | PlantUML |
```

In **Behavior**, change the PDF-only heavy-tool sentence to:

```md
- PDF, PlantUML, and other heavy tools use separate dynamic imports (`React.lazy`)
```

`docs/README.md`:

- Implementation plans table — add:

```md
| `superpowers/plans/2026-08-11-plantuml-viewer.md` | PlantUML viewer implementation plan |
```

- Feature docs table — add:

```md
| `features/plantuml.md` | PlantUML viewer (in-browser `@plantuml/core`) |
```

(The design-spec row for `2026-08-11-plantuml-viewer-design.md` already exists.)

`docs/architecture.md` — replace the heavy-tools sentence:

```md
Heavy tools (PDF, PlantUML) must be separate async chunks so first paint stays small.
```

`PRODUCT.md` **Capabilities and Constraints**:

- In the MVP tools paragraph, append: `PlantUML viewer (in-browser \`@plantuml/core\`, lazy chunk; SVG + PNG per diagram).`
- Replace the heavy-deps bullet with:

```md
- Heavy dependencies (`pdf.js`, `jszip`, `@plantuml/core`) must stay in an async chunk isolated to the tool that needs them so first paint elsewhere stays small.
```

- [ ] **Step 3: Commit**

```bash
git add docs/features/plantuml.md docs/features/tool-registry.md docs/README.md docs/architecture.md PRODUCT.md
git commit -m "$(cat <<'EOF'
docs(plantuml): add feature and index docs

EOF
)"
```

---

### Task 8: Verify engine is not in the home/main chunk

**Files:** none new (build output only).

This is the CI-shaped check from the spec: same lazy-split discipline as `pdfjs-dist`. Vitest remains the Pages deploy gate; this build grep is required before claiming done.

- [ ] **Step 1: Production build**

```bash
npm run build
```

Expected: `tsc -b` + Vite succeed. `@plantuml/core` / `viz-global.js` emit as hashed assets under `dist/assets/` (or a dedicated chunk), not fetched from unpkg/jsDelivr.

- [ ] **Step 2: Assert HTML-referenced entry chunks do not contain the engine**

```bash
node --input-type=module -e '
import { readFileSync } from "node:fs"
const html = readFileSync("dist/index.html", "utf8")
const files = [...html.matchAll(/assets\/([^"\\s>]+\.js)/g)].map((m) => m[1])
if (files.length === 0) {
  console.error("no JS assets referenced from dist/index.html")
  process.exit(1)
}
const leaked = []
for (const f of files) {
  const body = readFileSync("dist/assets/" + f, "utf8")
  if (
    body.includes("viz-global.js") ||
    body.includes("@plantuml/core/plantuml") ||
    /function renderToString/.test(body)
  ) {
    leaked.push(f)
  }
}
if (leaked.length) {
  console.error("PlantUML engine leaked into HTML-referenced chunk(s):", leaked.join(", "))
  process.exit(1)
}
console.log("ok: HTML-referenced chunks are plantuml-engine-free", files.join(", "))
'
```

Expected: `ok: HTML-referenced chunks are plantuml-engine-free …`

A dynamic `import('./PlantumlTool-….js')` string in the main chunk is allowed. TeaVM / viz source is not.

- [ ] **Step 3: Full unit suite (merge gate)**

```bash
npm test
```

Expected: all PASS. Do **not** run Playwright as a gate.

- [ ] **Step 4: Commit** only if Step 2 required a code fix (for example moving a static `@plantuml/core` import). If the build already splits correctly, no extra commit.

If a static import leaked the engine, remove it: `PlantumlTool.tsx` must import `./render`, and only `loadEngineOnce` inside `render.ts` may `import('@plantuml/core/plantuml.js')` / `import('…viz-global.js?url')`. Then rebuild and re-run Step 2.

```bash
git add src/tools/plantuml/render.ts src/tools/plantuml/PlantumlTool.tsx
git commit -m "$(cat <<'EOF'
chore(plantuml): keep engine out of main

EOF
)"
```

---

### Task 9: Optional e2e (not a merge gate)

Skip unless an executor explicitly wants a smoke test and CI can load the engine in a reasonable time.

**Files (only if doing this task):**
- Create: `testing/e2e/fixtures/tiny-sequence.puml`
- Create: `testing/e2e/plantuml.spec.ts`

- [ ] **Step 1 (optional): Fixture**

Create `testing/e2e/fixtures/tiny-sequence.puml`:

```
@startuml
Alice -> Bob: hello
@enduml
```

- [ ] **Step 2 (optional): Spec**

Create `testing/e2e/plantuml.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

test('plantuml visualize shows svg for a tiny sequence', async ({ page }) => {
  test.setTimeout(120_000)
  const src = readFileSync(
    path.join('testing/e2e/fixtures/tiny-sequence.puml'),
    'utf8',
  )
  await page.goto('/tools/plantuml')
  await page.getByLabel('PlantUML source').fill(src)
  await page.getByRole('button', { name: 'Visualize' }).click()
  await expect(page.locator('svg').first()).toBeVisible({ timeout: 90_000 })
  await expect(page.getByRole('button', { name: 'Download SVG' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download PNG' })).toBeVisible()
})
```

Start preview **outside** the Cursor sandbox netns (`required_permissions: ["all"]`) if hitting localhost from a host browser. Playwright’s `webServer` in `playwright.config.ts` is the supported path (`npm run test:e2e`).

- [ ] **Step 3 (optional): Run**

```bash
npx playwright install chromium
npm run test:e2e -- testing/e2e/plantuml.spec.ts
```

If this times out or OOM, **delete or skip the spec** and keep parse unit tests as the gate. Do not weaken privacy or switch to a CDN to make e2e pass.

- [ ] **Step 4 (optional): Commit only if the spec is kept**

```bash
git add testing/e2e/fixtures/tiny-sequence.puml testing/e2e/plantuml.spec.ts
git commit -m "$(cat <<'EOF'
test(plantuml): optional tiny sequence e2e

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Registry id `plantuml`, route `/tools/plantuml`, title PlantUML | 6, 7 |
| File picker **or** paste/edit; one buffer; pick replaces UTF-8 | 5 |
| `accept=".puml,.plantuml,.iuml,.wsd,.txt"`; show filename | 5 |
| Explicit **Visualize**, not live; disabled empty/whitespace/in-flight; **Visualizing…** | 5 |
| Stacked Source + ActionBar + full-width cards; **not** `IoGrid` | 5 |
| Every `@startuml`…`@enduml` block, file order; `Diagram N` | 1, 5 |
| No `@startuml` → whole textarea, `startLine === 1` | 1 |
| Unclosed block at EOF still emitted | 1 |
| Junk / other `@start*` between blocks discarded | 1 |
| `@startuml` / `@enduml` case-sensitive; `@startuml id` starts a block | 1 |
| Include scan: `!include*` prefix + `!import`; skip `'`; block comments not stripped | 2 |
| Include → error + file line; **never** call engine | 2, 5 |
| Path vs stdlib (`<…>`) copy exact from spec tables | 2, 5 |
| Engine syntax errors: file line when parseable; else raw message | 4, 5 |
| File read fail: `Could not read file` on source card | 5 |
| PNG fail: `Could not create PNG: …`; SVG remains | 5 |
| Per-card Download SVG + PNG; no JPEG on this tool | 5 |
| `{stem}-{n}` naming; paste/Clear → `diagram`; edit keeps stem | 5 |
| `svgToRaster(svg, { format: 'png', scale: 1 })` only; STOP if helper missing | 5 (gate) |
| `@plantuml/core` ≥ 1.2026.6 MIT; no GPL-era pin | 3 |
| Bundled `viz-global.js` classic `<script>` then `import()` `plantuml.js`; no CDN | 3, 4 |
| Sequential engine renders; TeaVM overwrite → mutex | 4, 5 |
| Engine singleton / reuse viz script on later Visualize | 4 |
| Lazy chunk; engine not in home/main | 6, 8 |
| Revoke object URLs on unmount / Clear / new run (PDF pattern) | 5 |
| No persistence / no remote plantuml.com / Kroki / include fetch | 4, 5, 7 |
| No dark mode, no pan/zoom lib, no stdlib pack, no JPEG controls | 5 |
| Unit tests do not boot `@plantuml/core`; parse is the gate | 1, 2, 4, 5 |
| Cheap UI: Visualize disabled; include copy without engine | 5 |
| Feature doc + registry table + README + architecture heavy-chunk + PRODUCT capabilities | 7 |
| Optional e2e fixture only | 9 |
| Impeccable / existing Button, Card via IoPanel, Textarea, ActionBar, ToolLayout (via ToolPage) | 5, 6 |
| Chunk/engine load fail → existing shell reload | 5 (`setFatal` → `ToolErrorBoundary`) |
| Client-only; no `localStorage` / `sessionStorage` / IndexedDB | all |

## Type consistency

- `parsePlantUml(source: string): ParsedBlock[]`
- `ParsedBlock = { startLine: number; lines: string[]; includeHit: IncludeHit \| null }`
- `IncludeHit = { fileLine: number; quoted: string; kind: 'path' \| 'stdlib' }`
- `formatIncludeError(hit: IncludeHit): string`
- `mapEngineError(message, startLine) → { error: string; line: number \| null }`
- `renderBlock(lines, startLine): Promise<EngineRenderResult>`
- `EngineRenderResult = { ok: true; svg } \| { ok: false; error; line }`
- `svgToRaster(svg, { format: 'png', scale: 1 }): Promise<Blob>`
- `ToolId` includes `'plantuml'`
- Registry `id` / folder / route: `plantuml`
- Download stem default `'diagram'`

## Spec gaps resolved in this plan

1. **Sister-owned `svgToRaster`** — spec file list includes it; this plan imports only and STOPs if missing.
2. **Engine error text shape** — unspecified; mapper uses `/line\s+(\d+)/i` and `fileLine = engineLine + startLine - 1`, then `Line N: …` with the number rewritten.
3. **`@startumlfoo` vs `@startuml(id)`** — delimiter is the token plus end or a non `[A-Za-z0-9_]` next char (allows space and `(`; rejects `foo` suffix).
4. **Nested / back-to-back `@startuml` without `@enduml`** — emit the open block, start a new one.
5. **`plantuml-core.d.ts`** — package ships no types; added so `tsc -b` works.
6. **Registry “exactly eight”** — assertion is “contains current tools + `plantuml`”; extras only `svg-to-image`.
7. **Async engine load vs error boundary** — `render()` / `import()` failures from Visualize are not React render errors; UI `setFatal` rethrows so `ToolErrorBoundary` shows reload.
8. **TeaVM overwrites in-flight `renderToString`** — documented mutex in `render.ts` in addition to sequential `await` in the UI.
9. **`viz-global.js` loading** — concrete `?url` dynamic import + classic `<script>` + Vite alias fallback; no TBD.
10. **Privacy.md** — not edited; existing “static app assets” covers bundled JS/WASM.
