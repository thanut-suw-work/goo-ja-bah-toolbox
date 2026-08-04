# GJB Toolbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fast CSR React+Vite+TS app “GJB Toolbox” with seven local-only tools, docs-driven layout, mirrored Vitest/Playwright tests, and Impeccable Operate UI.

**Architecture:** Static SPA with AppShell + react-router. Tools register in `src/tools/registry.ts` with `React.lazy`. Pure logic lives beside each tool UI. No persistence, no telemetry. PDF tool lazy-loads `pdfjs-dist` and zips multi-page output.

**Tech Stack:** React 19 · Vite · TypeScript · react-router · Vitest · Playwright · pdfjs-dist · jszip · Impeccable (PRODUCT.md / DESIGN.md)

**Spec:** `docs/superpowers/specs/2026-08-05-gjb-toolbox-design.md`  
**Agent entry:** `AGENTS.md` → `docs/README.md`

---

## File map (create)

```
package.json
vite.config.ts
tsconfig.json
tsconfig.app.json
tsconfig.node.json
index.html
src/main.tsx
src/vite-env.d.ts
src/styles/global.css
src/app/App.tsx
src/app/AppShell.tsx
src/app/HomePage.tsx
src/app/ToolPage.tsx
src/app/NotFoundPage.tsx
src/tools/types.ts
src/tools/registry.ts
src/tools/json-formatter/logic.ts
src/tools/json-formatter/JsonFormatterTool.tsx
src/tools/base64/logic.ts
src/tools/base64/Base64Tool.tsx
src/tools/uuid/logic.ts
src/tools/uuid/UuidTool.tsx
src/tools/hash-sha256/logic.ts
src/tools/hash-sha256/HashSha256Tool.tsx
src/tools/unix-timestamp/logic.ts
src/tools/unix-timestamp/UnixTimestampTool.tsx
src/tools/text-case/logic.ts
src/tools/text-case/TextCaseTool.tsx
src/tools/pdf-to-image/range.ts
src/tools/pdf-to-image/convert.ts
src/tools/pdf-to-image/PdfToImageTool.tsx
src/tools/shared/ToolLayout.tsx
src/tools/shared/CopyButton.tsx
testing/unit/tools/json-formatter/logic.test.ts
testing/unit/tools/base64/logic.test.ts
testing/unit/tools/uuid/logic.test.ts
testing/unit/tools/hash-sha256/logic.test.ts
testing/unit/tools/unix-timestamp/logic.test.ts
testing/unit/tools/text-case/logic.test.ts
testing/unit/tools/pdf-to-image/range.test.ts
testing/unit/tools/registry.test.ts
testing/e2e/home.spec.ts
testing/e2e/json-formatter.spec.ts
testing/e2e/fixtures/tiny.pdf
playwright.config.ts
vitest.config.ts
```

Keep existing `docs/`, `AGENTS.md`, `testing/README.md`. Do not add `localStorage`, analytics, or APIs.

---

### Task 1: Scaffold Vite React-TS + Vitest

**Files:**
- Create: `package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json`, `index.html`, `src/main.tsx`, `src/vite-env.d.ts`, `src/app/App.tsx`, `src/styles/global.css`
- Modify: `testing/README.md` (fill real commands)
- Modify: root `README.md` (dev/build scripts)

- [ ] **Step 1: Scaffold**

From repo root (preserve `docs/`, `AGENTS.md`, `.gitignore`, `testing/`):

```bash
npm create vite@latest . -- --template react-ts
```

If prompt about non-empty dir: choose continue / force as Vite allows, or manually create equivalent files. Then:

```bash
npm install
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install react-router-dom
```

- [ ] **Step 2: Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['testing/unit/**/*.{test,spec}.{ts,tsx}'],
    globals: true,
  },
})
```

Add to `package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 3: Minimal App smoke**

`src/app/App.tsx`:

```tsx
export function App() {
  return <h1>GJB Toolbox</h1>
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './styles/global.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 4: Verify build**

```bash
npm run build
npm test
```

Expected: build succeeds; vitest runs 0 tests (or pass).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.ts vitest.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json index.html src testing/README.md README.md
git commit -m "chore: scaffold Vite React-TS + Vitest"
```

---

### Task 2: Types, registry stub, unit test

**Files:**
- Create: `src/tools/types.ts`, `src/tools/registry.ts`
- Test: `testing/unit/tools/registry.test.ts`

- [ ] **Step 1: Failing test**

```ts
// testing/unit/tools/registry.test.ts
import { describe, it, expect } from 'vitest'
import { tools, getToolById } from '@/tools/registry'

describe('registry', () => {
  it('exposes unique ids', () => {
    const ids = tools.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('getToolById returns undefined for unknown', () => {
    expect(getToolById('nope')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
npm test -- testing/unit/tools/registry.test.ts
```

Expected: FAIL cannot find module `@/tools/registry`

- [ ] **Step 3: Implement types + empty-ready registry**

```ts
// src/tools/types.ts
import type { ComponentType, LazyExoticComponent } from 'react'

export type ToolId =
  | 'json-formatter'
  | 'base64'
  | 'uuid'
  | 'hash-sha256'
  | 'unix-timestamp'
  | 'text-case'
  | 'pdf-to-image'

export type ToolDefinition = {
  id: ToolId
  title: string
  description: string
  component: LazyExoticComponent<ComponentType>
}
```

```ts
// src/tools/registry.ts
import { lazy } from 'react'
import type { ToolDefinition, ToolId } from './types'

export const tools: ToolDefinition[] = [
  // filled in later tasks — start with json-formatter only after Task 4;
  // for this task keep array empty OR skip until Task 4.
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
```

Adjust test for empty registry: unique ids still passes; add:

```ts
it('starts with zero tools before features land', () => {
  expect(tools.length).toBe(0)
})
```

(Later tasks update this expectation to `7`.)

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- testing/unit/tools/registry.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/tools/types.ts src/tools/registry.ts testing/unit/tools/registry.test.ts
git commit -m "feat: add tool registry types"
```

---

### Task 3: Router + AppShell + Home (functional chrome)

**Files:**
- Create: `src/app/AppShell.tsx`, `src/app/HomePage.tsx`, `src/app/ToolPage.tsx`, `src/app/NotFoundPage.tsx`, `src/tools/shared/ToolLayout.tsx`
- Modify: `src/app/App.tsx`, `src/main.tsx`
- Test: `testing/e2e` deferred to Task 11; optional RTL smoke optional skip

- [ ] **Step 1: Shared ToolLayout**

```tsx
// src/tools/shared/ToolLayout.tsx
import type { ReactNode } from 'react'

type Props = {
  title: string
  description: string
  children: ReactNode
}

export function ToolLayout({ title, description, children }: Props) {
  return (
    <section>
      <header>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      <div>{children}</div>
    </section>
  )
}
```

- [ ] **Step 2: Pages + shell**

```tsx
// src/app/AppShell.tsx
import { Link, Outlet } from 'react-router-dom'

export function AppShell() {
  return (
    <div>
      <header>
        <Link to="/">
          <strong>GJB Toolbox</strong>
        </Link>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
```

```tsx
// src/app/HomePage.tsx
import { Link } from 'react-router-dom'
import { tools } from '@/tools/registry'

export function HomePage() {
  return (
    <div>
      <h1>GJB Toolbox</h1>
      <p>Local browser utilities. Nothing leaves your machine.</p>
      <ul>
        {tools.map((t) => (
          <li key={t.id}>
            <Link to={`/tools/${t.id}`}>
              <span>{t.title}</span>
              <span>{t.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

```tsx
// src/app/ToolPage.tsx
import { Suspense } from 'react'
import { useParams } from 'react-router-dom'
import { getToolById } from '@/tools/registry'
import { ToolLayout } from '@/tools/shared/ToolLayout'
import { NotFoundPage } from './NotFoundPage'

export function ToolPage() {
  const { id } = useParams()
  const tool = id ? getToolById(id) : undefined
  if (!tool) return <NotFoundPage />

  const Comp = tool.component
  return (
    <ToolLayout title={tool.title} description={tool.description}>
      <Suspense fallback={<p>Loading…</p>}>
        <Comp />
      </Suspense>
    </ToolLayout>
  )
}
```

```tsx
// src/app/NotFoundPage.tsx
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div>
      <h1>Not found</h1>
      <Link to="/">Back home</Link>
    </div>
  )
}
```

```tsx
// src/app/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './AppShell'
import { HomePage } from './HomePage'
import { ToolPage } from './ToolPage'
import { NotFoundPage } from './NotFoundPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="tools/:id" element={<ToolPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Run dev briefly**

```bash
npm run dev
```

Open `/` — see brand + empty list. Stop after smoke.

- [ ] **Step 4: Commit**

```bash
git add src/app src/tools/shared
git commit -m "feat: add shell, router, home"
```

---

### Task 4: JSON formatter (TDD)

**Files:**
- Create: `src/tools/json-formatter/logic.ts`, `src/tools/json-formatter/JsonFormatterTool.tsx`
- Modify: `src/tools/registry.ts`, `testing/unit/tools/registry.test.ts`
- Test: `testing/unit/tools/json-formatter/logic.test.ts`

- [ ] **Step 1: Failing tests**

```ts
// testing/unit/tools/json-formatter/logic.test.ts
import { describe, it, expect } from 'vitest'
import { formatJson } from '@/tools/json-formatter/logic'

describe('formatJson', () => {
  it('prettifies valid json', () => {
    const r = formatJson('{"a":1}', 'pretty')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.text).toBe('{\n  "a": 1\n}')
  })

  it('minifies valid json', () => {
    const r = formatJson('{\n  "a": 1\n}', 'minify')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.text).toBe('{"a":1}')
  })

  it('returns error on invalid json', () => {
    const r = formatJson('{', 'pretty')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run — expect fail**

```bash
npm test -- testing/unit/tools/json-formatter/logic.test.ts
```

- [ ] **Step 3: Implement logic + UI**

```ts
// src/tools/json-formatter/logic.ts
export type FormatMode = 'pretty' | 'minify'

export type FormatResult =
  | { ok: true; text: string }
  | { ok: false; error: string }

export function formatJson(input: string, mode: FormatMode): FormatResult {
  try {
    const value = JSON.parse(input)
    const text =
      mode === 'pretty' ? JSON.stringify(value, null, 2) : JSON.stringify(value)
    return { ok: true, text }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Invalid JSON',
    }
  }
}
```

```tsx
// src/tools/json-formatter/JsonFormatterTool.tsx
import { useState } from 'react'
import { formatJson, type FormatMode } from './logic'

export function JsonFormatterTool() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<FormatMode>('pretty')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)

  function run() {
    const r = formatJson(input, mode)
    if (r.ok) {
      setOutput(r.text)
      setError(null)
    } else {
      setError(r.error)
    }
  }

  return (
    <div>
      <label>
        Mode
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as FormatMode)}
        >
          <option value="pretty">Pretty</option>
          <option value="minify">Minify</option>
        </select>
      </label>
      <textarea
        aria-label="JSON input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={10}
      />
      <button type="button" onClick={run}>
        Format
      </button>
      {error ? <p role="alert">{error}</p> : null}
      <textarea aria-label="JSON output" value={output} readOnly rows={10} />
    </div>
  )
}

export default JsonFormatterTool
```

Register:

```ts
// in src/tools/registry.ts — add import lazy already present
{
  id: 'json-formatter',
  title: 'JSON formatter',
  description: 'Pretty-print or minify JSON in your browser.',
  component: lazy(() => import('./json-formatter/JsonFormatterTool')),
},
```

Update registry test: remove “zero tools” assertion; expect `tools.some(t => t.id === 'json-formatter')`.

- [ ] **Step 4: Pass tests**

```bash
npm test -- testing/unit/tools/json-formatter/logic.test.ts testing/unit/tools/registry.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/tools/json-formatter src/tools/registry.ts testing/unit/tools/json-formatter testing/unit/tools/registry.test.ts
git commit -m "feat: add JSON formatter tool"
```

---

### Task 5: Base64 (TDD)

**Files:**
- Create: `src/tools/base64/logic.ts`, `src/tools/base64/Base64Tool.tsx`
- Modify: `src/tools/registry.ts`
- Test: `testing/unit/tools/base64/logic.test.ts`

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { encodeBase64, decodeBase64 } from '@/tools/base64/logic'

describe('base64', () => {
  it('encodes utf-8 text', () => {
    expect(encodeBase64('hi')).toBe(btoa('hi'))
  })

  it('decodes round-trip', () => {
    const r = decodeBase64(encodeBase64('café'))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.text).toBe('café')
  })

  it('errors on invalid base64', () => {
    const r = decodeBase64('@@@')
    expect(r.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run — fail**

```bash
npm test -- testing/unit/tools/base64/logic.test.ts
```

- [ ] **Step 3: Implement**

```ts
// src/tools/base64/logic.ts
function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export function encodeBase64(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text))
}

export type DecodeResult =
  | { ok: true; text: string }
  | { ok: false; error: string }

export function decodeBase64(b64: string): DecodeResult {
  try {
    const cleaned = b64.replace(/\s+/g, '')
    const text = new TextDecoder().decode(base64ToBytes(cleaned))
    return { ok: true, text }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Invalid Base64',
    }
  }
}
```

UI: mode select encode/decode, textarea in/out, inline error, button Run. Default export component. Register `id: 'base64'`.

- [ ] **Step 4: Pass + commit**

```bash
npm test -- testing/unit/tools/base64/logic.test.ts
git add src/tools/base64 src/tools/registry.ts testing/unit/tools/base64
git commit -m "feat: add Base64 tool"
```

---

### Task 6: UUID (TDD)

**Files:**
- Create: `src/tools/uuid/logic.ts`, `src/tools/uuid/UuidTool.tsx`
- Modify: `src/tools/registry.ts`
- Test: `testing/unit/tools/uuid/logic.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect, vi } from 'vitest'
import { generateUuids } from '@/tools/uuid/logic'

describe('generateUuids', () => {
  it('returns n ids from crypto.randomUUID', () => {
    vi.stubGlobal('crypto', {
      randomUUID: vi
        .fn()
        .mockReturnValueOnce('a')
        .mockReturnValueOnce('b'),
    })
    expect(generateUuids(2)).toEqual(['a', 'b'])
  })
})
```

- [ ] **Step 2–4: Implement, pass, commit**

```ts
export function generateUuids(count: number): string[] {
  const n = Math.max(1, Math.min(100, Math.floor(count)))
  return Array.from({ length: n }, () => crypto.randomUUID())
}
```

UI: number input + Generate + list/textarea. Register `uuid`.

```bash
npm test -- testing/unit/tools/uuid/logic.test.ts
git add src/tools/uuid src/tools/registry.ts testing/unit/tools/uuid
git commit -m "feat: add UUID tool"
```

---

### Task 7: SHA-256 hash (TDD)

**Files:**
- Create: `src/tools/hash-sha256/logic.ts`, `src/tools/hash-sha256/HashSha256Tool.tsx`
- Modify: `src/tools/registry.ts`
- Test: `testing/unit/tools/hash-sha256/logic.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { describe, it, expect } from 'vitest'
import { sha256Hex } from '@/tools/hash-sha256/logic'

describe('sha256Hex', () => {
  it('hashes empty string', async () => {
    // e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    await expect(sha256Hex('')).resolves.toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
  })

  it('hashes abc', async () => {
    await expect(sha256Hex('abc')).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })
})
```

- [ ] **Step 2–4: Implement, pass, commit**

```ts
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
```

UI: textarea + Hash button + output. Register `hash-sha256`.

```bash
npm test -- testing/unit/tools/hash-sha256/logic.test.ts
git add src/tools/hash-sha256 src/tools/registry.ts testing/unit/tools/hash-sha256
git commit -m "feat: add SHA-256 hash tool"
```

---

### Task 8: Unix timestamp (TDD)

**Files:**
- Create: `src/tools/unix-timestamp/logic.ts`, `src/tools/unix-timestamp/UnixTimestampTool.tsx`
- Modify: `src/tools/registry.ts`
- Test: `testing/unit/tools/unix-timestamp/logic.test.ts`

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect } from 'vitest'
import {
  timestampToIsoUtc,
  isoToUnixSeconds,
} from '@/tools/unix-timestamp/logic'

describe('unix timestamp', () => {
  it('converts seconds to ISO UTC', () => {
    expect(timestampToIsoUtc(0)).toEqual({
      ok: true,
      iso: '1970-01-01T00:00:00.000Z',
    })
  })

  it('parses ISO to seconds', () => {
    expect(isoToUnixSeconds('1970-01-01T00:00:00.000Z')).toEqual({
      ok: true,
      seconds: 0,
    })
  })

  it('rejects invalid number', () => {
    expect(timestampToIsoUtc(Number.NaN).ok).toBe(false)
  })
})
```

- [ ] **Step 2–4: Implement, pass, commit**

```ts
export type TsResult =
  | { ok: true; iso: string }
  | { ok: false; error: string }

export type SecResult =
  | { ok: true; seconds: number }
  | { ok: false; error: string }

export function timestampToIsoUtc(seconds: number): TsResult {
  if (!Number.isFinite(seconds)) {
    return { ok: false, error: 'Invalid timestamp' }
  }
  const d = new Date(seconds * 1000)
  if (Number.isNaN(d.getTime())) {
    return { ok: false, error: 'Invalid timestamp' }
  }
  return { ok: true, iso: d.toISOString() }
}

export function isoToUnixSeconds(iso: string): SecResult {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return { ok: false, error: 'Invalid date/time' }
  return { ok: true, seconds: Math.floor(ms / 1000) }
}
```

UI: two panels (ts→ISO, ISO→ts). Document UTC in description. Register `unix-timestamp`.

```bash
npm test -- testing/unit/tools/unix-timestamp/logic.test.ts
git add src/tools/unix-timestamp src/tools/registry.ts testing/unit/tools/unix-timestamp
git commit -m "feat: add Unix timestamp tool"
```

---

### Task 9: Text case (TDD)

**Files:**
- Create: `src/tools/text-case/logic.ts`, `src/tools/text-case/TextCaseTool.tsx`
- Modify: `src/tools/registry.ts`
- Test: `testing/unit/tools/text-case/logic.test.ts`

- [ ] **Step 1: Failing tests**

```ts
import { describe, it, expect } from 'vitest'
import { transformCase } from '@/tools/text-case/logic'

describe('transformCase', () => {
  it('lower', () => {
    expect(transformCase('AbC', 'lower')).toBe('abc')
  })
  it('upper', () => {
    expect(transformCase('AbC', 'upper')).toBe('ABC')
  })
  it('title', () => {
    expect(transformCase('hello world', 'title')).toBe('Hello World')
  })
  it('camel', () => {
    expect(transformCase('hello world', 'camel')).toBe('helloWorld')
  })
  it('snake', () => {
    expect(transformCase('Hello World', 'snake')).toBe('hello_world')
  })
})
```

- [ ] **Step 2–4: Implement, pass, commit**

```ts
export type CaseMode = 'lower' | 'upper' | 'title' | 'camel' | 'snake'

function words(input: string): string[] {
  return input
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_\-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
}

export function transformCase(input: string, mode: CaseMode): string {
  switch (mode) {
    case 'lower':
      return input.toLowerCase()
    case 'upper':
      return input.toUpperCase()
    case 'title':
      return words(input)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ')
    case 'camel': {
      const w = words(input).map((x) => x.toLowerCase())
      if (w.length === 0) return ''
      return (
        w[0] +
        w
          .slice(1)
          .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
          .join('')
      )
    }
    case 'snake':
      return words(input)
        .map((w) => w.toLowerCase())
        .join('_')
  }
}
```

Register `text-case`.

```bash
npm test -- testing/unit/tools/text-case/logic.test.ts
git add src/tools/text-case src/tools/registry.ts testing/unit/tools/text-case
git commit -m "feat: add text case tool"
```

---

### Task 10: PDF page-range helpers + tool (TDD for range; convert integration)

**Files:**
- Create: `src/tools/pdf-to-image/range.ts`, `src/tools/pdf-to-image/convert.ts`, `src/tools/pdf-to-image/PdfToImageTool.tsx`
- Modify: `src/tools/registry.ts`
- Test: `testing/unit/tools/pdf-to-image/range.test.ts`
- Deps: `pdfjs-dist`, `jszip`, `@types` as needed

- [ ] **Step 1: Install deps**

```bash
npm install pdfjs-dist jszip
```

- [ ] **Step 2: Failing range tests**

```ts
import { describe, it, expect } from 'vitest'
import { normalizePageRange } from '@/tools/pdf-to-image/range'

describe('normalizePageRange', () => {
  it('accepts valid inclusive range', () => {
    expect(normalizePageRange(1, 3, 5)).toEqual({
      ok: true,
      from: 1,
      to: 3,
    })
  })

  it('rejects from > to', () => {
    expect(normalizePageRange(4, 2, 5).ok).toBe(false)
  })

  it('rejects out of bounds', () => {
    expect(normalizePageRange(0, 1, 5).ok).toBe(false)
    expect(normalizePageRange(1, 6, 5).ok).toBe(false)
  })
})
```

- [ ] **Step 3: Implement range**

```ts
export type RangeResult =
  | { ok: true; from: number; to: number }
  | { ok: false; error: string }

export function normalizePageRange(
  from: number,
  to: number,
  pageCount: number,
): RangeResult {
  if (!Number.isInteger(from) || !Number.isInteger(to)) {
    return { ok: false, error: 'Pages must be integers' }
  }
  if (from < 1 || to < 1 || from > pageCount || to > pageCount) {
    return { ok: false, error: `Pages must be between 1 and ${pageCount}` }
  }
  if (from > to) {
    return { ok: false, error: 'From page must be ≤ to page' }
  }
  return { ok: true, from, to }
}
```

- [ ] **Step 4: convert.ts + UI**

`convert.ts` responsibilities:
- Configure `pdfjs-dist` worker (Vite: `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)` or documented Vite pattern for the installed version)
- `getPdfPageCount(file: File): Promise<number>`
- `renderPagesToBlobs(file, from, to, format: 'png' | 'jpg'): Promise<Blob[]>` using canvas
- `downloadBlobs(blobs, format): Promise<void>` — one blob → object URL download; many → JSZip `pages.zip`

`PdfToImageTool.tsx`:
- file input `accept="application/pdf"`
- show page count after load
- from/to number inputs, format select
- Convert button → download
- inline errors; `useEffect` cleanup revoke URLs / clear file on unmount

Register lazy `pdf-to-image`.

- [ ] **Step 5: Tests + build**

```bash
npm test -- testing/unit/tools/pdf-to-image/range.test.ts
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/tools/pdf-to-image src/tools/registry.ts testing/unit/tools/pdf-to-image package.json package-lock.json
git commit -m "feat: add PDF to image tool"
```

- [ ] **Step 7: Finalize registry test**

Update `testing/unit/tools/registry.test.ts` to expect exactly these seven ids (order free):

```ts
const expected = [
  'json-formatter',
  'base64',
  'uuid',
  'hash-sha256',
  'unix-timestamp',
  'text-case',
  'pdf-to-image',
]
expect(tools.map((t) => t.id).sort()).toEqual([...expected].sort())
```

```bash
npm test
git add testing/unit/tools/registry.test.ts
git commit -m "test: assert full tool registry"
```

---

### Task 11: Playwright e2e

**Files:**
- Create: `playwright.config.ts`, `testing/e2e/home.spec.ts`, `testing/e2e/json-formatter.spec.ts`, `testing/e2e/fixtures/tiny.pdf` (minimal valid PDF bytes)
- Modify: `package.json`, `testing/README.md`

- [ ] **Step 1: Install**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Config**

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './testing/e2e',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
```

Script: `"test:e2e": "playwright test"`

- [ ] **Step 3: Specs**

```ts
// testing/e2e/home.spec.ts
import { test, expect } from '@playwright/test'

test('home shows brand and tools', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('strong', { name: 'GJB Toolbox' })).toBeVisible()
  await expect(page.getByRole('link', { name: /JSON formatter/i })).toBeVisible()
})
```

```ts
// testing/e2e/json-formatter.spec.ts
import { test, expect } from '@playwright/test'

test('formats json', async ({ page }) => {
  await page.goto('/tools/json-formatter')
  await page.getByLabel('JSON input').fill('{"a":1}')
  await page.getByRole('button', { name: 'Format' }).click()
  await expect(page.getByLabel('JSON output')).toHaveValue(/"a": 1/)
})
```

Create a tiny PDF fixture (minimal PDF file checked into `testing/e2e/fixtures/tiny.pdf`). Optional smoke: open PDF tool, set file, assert page count visible — skip zip download assert if flaky.

- [ ] **Step 4: Run**

```bash
npm run test:e2e
```

Expected: pass.

- [ ] **Step 5: Commit**

```bash
git add playwright.config.ts testing/e2e package.json package-lock.json testing/README.md
git commit -m "test: add Playwright e2e smoke"
```

---

### Task 12: Impeccable UI (Operate) + privacy polish

**Files:**
- Create/update via Impeccable: `PRODUCT.md`, `DESIGN.md`, `.impeccable/` as skill directs
- Modify: `src/styles/global.css`, shell/home/tool layout markup as needed for the chosen visual world
- Docs: ensure `docs/privacy.md` still accurate; no persistence introduced

- [ ] **Step 1: Impeccable init / new-work**

Follow Impeccable skill: run `context.mjs`, then `init` / new-work for Operate mode app shell + home. Commit PRODUCT.md / DESIGN.md when generated.

- [ ] **Step 2: Apply visual system**

Restyle AppShell, HomePage, ToolLayout, and shared controls to match DESIGN.md. Keep structure/routes/behavior unchanged. No cards-in-hero clutter; brand “GJB Toolbox” strong on home.

- [ ] **Step 3: Verify**

```bash
npm test
npm run test:e2e
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add PRODUCT.md DESIGN.md .impeccable src/styles src/app src/tools/shared
git commit -m "feat: apply Impeccable Operate visual system"
```

---

### Task 13: Docs sync + final gate

**Files:**
- Modify: `docs/features/*.md` only if implementation ids/behavior differ
- Modify: `testing/README.md`, root `README.md` with exact scripts
- Modify: `docs/README.md` if paths changed

- [ ] **Step 1: Sync docs to reality** (ids, run commands, worker note for pdfjs)

- [ ] **Step 2: Full verify**

```bash
npm test
npm run test:e2e
npm run build
```

Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add docs README.md testing/README.md
git commit -m "docs: sync feature docs with implementation"
```

---

## Self-review (plan vs spec)

| Spec item | Task |
|-----------|------|
| React+Vite+TS CSR | 1 |
| Registry + lazy routes | 2–3, 4–10 |
| Seven tools listed | 4–10 |
| Ephemeral / no storage / no telemetry | 3–12 (hard rule; privacy polish 12–13) |
| PDF page range + zip multi | 10 |
| Docs-driven already present | 13 sync |
| `testing/` mirror Vitest + Playwright | 1, 4–11 |
| Impeccable Operate UI | 12 |

No TBD placeholders left. Types: `ToolId` union matches all registry ids. PDF id locked: `pdf-to-image`.
