# UTF Encoding Bi-Converter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Base64-style tool that converts text ↔ spaced hex for UTF-8 / UTF-16LE / UTF-32LE with optional BOM.

**Architecture:** Pure helpers in `logic.ts` (parse/format hex, encode/decode per encoding). React UI clones Base64 IoPanels + ActionBar. Register lazy route `utf-encoding`. No new dependencies.

**Tech Stack:** React 19 · Vite · TypeScript · Vitest · existing `IoPanels` / shadcn Button/Textarea

**Spec:** `docs/superpowers/specs/2026-08-08-utf-encoding-design.md`

---

## File map

**Create:**
```
src/tools/utf-encoding/logic.ts
src/tools/utf-encoding/UtfEncodingTool.tsx
testing/unit/tools/utf-encoding/logic.test.ts
docs/features/utf-encoding.md
```

**Modify:**
```
src/tools/types.ts
src/tools/registry.ts
testing/unit/tools/registry.test.ts
docs/features/tool-registry.md
docs/README.md
```

---

### Task 1: Hex parse + format (TDD)

**Files:**
- Create: `testing/unit/tools/utf-encoding/logic.test.ts`
- Create: `src/tools/utf-encoding/logic.ts`

- [ ] **Step 1: Write failing tests for `parseHex` / `formatHex`**

Create `testing/unit/tools/utf-encoding/logic.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatHex, parseHex } from '@/tools/utf-encoding/logic'

describe('formatHex / parseHex', () => {
  it('formats uppercase spaced hex', () => {
    expect(formatHex(new Uint8Array([0x48, 0x65, 0x6c]))).toBe('48 65 6C')
  })

  it('parses spaced, continuous, 0x, and commas', () => {
    const a = parseHex('48 65 6C')
    const b = parseHex('48656c')
    const c = parseHex('0x48,0x65,0x6C')
    expect(a.ok && b.ok && c.ok).toBe(true)
    if (a.ok && b.ok && c.ok) {
      expect([...a.bytes]).toEqual([0x48, 0x65, 0x6c])
      expect([...b.bytes]).toEqual([0x48, 0x65, 0x6c])
      expect([...c.bytes]).toEqual([0x48, 0x65, 0x6c])
    }
  })

  it('errors on odd nibble length', () => {
    const r = parseHex('486')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/odd|length|nibble/i)
  })

  it('errors on non-hex', () => {
    const r = parseHex('zz')
    expect(r.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- testing/unit/tools/utf-encoding/logic.test.ts
```

Expected: FAIL (module not found / exports missing).

- [ ] **Step 3: Implement `parseHex` + `formatHex`**

Create `src/tools/utf-encoding/logic.ts`:

```ts
export type UtfEncoding = 'utf-8' | 'utf-16le' | 'utf-32le'

export type HexParseResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; error: string }

export type UtfDecodeResult =
  | { ok: true; text: string }
  | { ok: false; error: string }

export function formatHex(bytes: Uint8Array): string {
  return [...bytes]
    .map((b) => b.toString(16).toUpperCase().padStart(2, '0'))
    .join(' ')
}

export function parseHex(input: string): HexParseResult {
  let s = input.replace(/0x/gi, '').replace(/[\s,]/g, '')
  if (s.length === 0) return { ok: false, error: 'Empty hex input' }
  if (s.length % 2 !== 0) {
    return { ok: false, error: 'Odd hex length (incomplete byte)' }
  }
  if (!/^[0-9a-fA-F]+$/.test(s)) {
    return { ok: false, error: 'Invalid hex characters' }
  }
  const bytes = new Uint8Array(s.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(s.slice(i * 2, i * 2 + 2), 16)
  }
  return { ok: true, bytes }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- testing/unit/tools/utf-encoding/logic.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/tools/utf-encoding/logic.ts testing/unit/tools/utf-encoding/logic.test.ts
git commit -m "$(cat <<'EOF'
feat(utf-encoding): add hex parse and format helpers

EOF
)"
```

---

### Task 2: UTF-8 encode / decode (TDD)

**Files:**
- Modify: `src/tools/utf-encoding/logic.ts`
- Modify: `testing/unit/tools/utf-encoding/logic.test.ts`

- [ ] **Step 1: Write failing UTF-8 tests**

Append to `logic.test.ts`:

```ts
import { encodeUtf, decodeUtf } from '@/tools/utf-encoding/logic'

describe('utf-8', () => {
  it('round-trips ASCII and accented text', () => {
    const hex = encodeUtf('café', 'utf-8', false)
    expect(hex).toBe('63 61 66 C3 A9')
    const r = decodeUtf(hex, 'utf-8', false)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.text).toBe('café')
  })

  it('round-trips emoji', () => {
    const hex = encodeUtf('😀', 'utf-8', false)
    const r = decodeUtf(hex, 'utf-8', false)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.text).toBe('😀')
  })

  it('errors on invalid utf-8 bytes', () => {
    const r = decodeUtf('FF', 'utf-8', false)
    expect(r.ok).toBe(false)
  })

  it('ignores bom flag for utf-8 encode', () => {
    expect(encodeUtf('A', 'utf-8', true)).toBe('41')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- testing/unit/tools/utf-encoding/logic.test.ts
```

Expected: FAIL (`encodeUtf` / `decodeUtf` not defined).

- [ ] **Step 3: Implement UTF-8 paths in `encodeUtf` / `decodeUtf`**

Append to `logic.ts` (stub other encodings with throw for now, or only handle `utf-8`):

```ts
export function encodeUtf(
  text: string,
  encoding: UtfEncoding,
  bom: boolean,
): string {
  if (encoding === 'utf-8') {
    void bom
    return formatHex(new TextEncoder().encode(text))
  }
  throw new Error(`encode not implemented: ${encoding}`)
}

export function decodeUtf(
  hex: string,
  encoding: UtfEncoding,
  bom: boolean,
): UtfDecodeResult {
  const parsed = parseHex(hex)
  if (!parsed.ok) return parsed
  let bytes = parsed.bytes
  if (encoding === 'utf-8') {
    void bom
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      return { ok: true, text }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : 'Invalid UTF-8',
      }
    }
  }
  throw new Error(`decode not implemented: ${encoding}`)
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- testing/unit/tools/utf-encoding/logic.test.ts
```

Expected: PASS (all current tests).

- [ ] **Step 5: Commit**

```bash
git add src/tools/utf-encoding/logic.ts testing/unit/tools/utf-encoding/logic.test.ts
git commit -m "$(cat <<'EOF'
feat(utf-encoding): add UTF-8 encode and decode

EOF
)"
```

---

### Task 3: UTF-16LE encode / decode + BOM (TDD)

**Files:**
- Modify: `src/tools/utf-encoding/logic.ts`
- Modify: `testing/unit/tools/utf-encoding/logic.test.ts`

- [ ] **Step 1: Write failing UTF-16LE tests**

Append:

```ts
describe('utf-16le', () => {
  it('encodes ASCII without BOM', () => {
    expect(encodeUtf('Hi', 'utf-16le', false)).toBe('48 00 69 00')
  })

  it('encodes with BOM when requested', () => {
    expect(encodeUtf('A', 'utf-16le', true)).toBe('FF FE 41 00')
  })

  it('round-trips emoji (surrogate pair)', () => {
    const hex = encodeUtf('😀', 'utf-16le', false)
    const r = decodeUtf(hex, 'utf-16le', false)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.text).toBe('😀')
  })

  it('strips BOM on decode only when bom flag on', () => {
    const withBom = encodeUtf('A', 'utf-16le', true)
    const stripped = decodeUtf(withBom, 'utf-16le', true)
    expect(stripped.ok && stripped.text).toBe('A')
    // bom off: leading FF FE decoded as code units → U+FEFF + 'A'
    const kept = decodeUtf(withBom, 'utf-16le', false)
    expect(kept.ok).toBe(true)
    if (kept.ok) expect(kept.text).toBe('\uFEFFA')
  })

  it('errors on truncated code unit', () => {
    const r = decodeUtf('48', 'utf-16le', false)
    expect(r.ok).toBe(false)
  })

  it('errors on lone high surrogate', () => {
    // U+D800 alone LE: 00 D8
    const r = decodeUtf('00 D8', 'utf-16le', false)
    expect(r.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- testing/unit/tools/utf-encoding/logic.test.ts
```

Expected: FAIL on utf-16le paths (`encode not implemented` or wrong results).

- [ ] **Step 3: Implement UTF-16LE in `logic.ts`**

Replace throws with full encode/decode. Keep helpers private in same file:

```ts
const UTF16_BOM = [0xff, 0xfe] as const

function encodeUtf16Le(text: string, bom: boolean): Uint8Array {
  const units: number[] = []
  if (bom) units.push(0xfeff)
  for (const ch of text) {
    const cp = ch.codePointAt(0)!
    if (cp <= 0xffff) {
      units.push(cp)
    } else {
      const adj = cp - 0x10000
      units.push(0xd800 + (adj >> 10))
      units.push(0xdc00 + (adj & 0x3ff))
    }
  }
  const out = new Uint8Array(units.length * 2)
  for (let i = 0; i < units.length; i++) {
    out[i * 2] = units[i] & 0xff
    out[i * 2 + 1] = (units[i] >> 8) & 0xff
  }
  return out
}

function decodeUtf16Le(bytes: Uint8Array, bom: boolean): UtfDecodeResult {
  let offset = 0
  if (
    bom &&
    bytes.length >= 2 &&
    bytes[0] === UTF16_BOM[0] &&
    bytes[1] === UTF16_BOM[1]
  ) {
    offset = 2
  }
  const slice = bytes.subarray(offset)
  if (slice.length % 2 !== 0) {
    return { ok: false, error: 'Truncated UTF-16LE (odd byte length)' }
  }
  let text = ''
  for (let i = 0; i < slice.length; i += 2) {
    const unit = slice[i]! | (slice[i + 1]! << 8)
    if (unit >= 0xd800 && unit <= 0xdbff) {
      if (i + 3 >= slice.length) {
        return { ok: false, error: 'Lone high surrogate in UTF-16LE' }
      }
      const low = slice[i + 2]! | (slice[i + 3]! << 8)
      if (low < 0xdc00 || low > 0xdfff) {
        return { ok: false, error: 'Invalid surrogate pair in UTF-16LE' }
      }
      const cp = 0x10000 + ((unit - 0xd800) << 10) + (low - 0xdc00)
      text += String.fromCodePoint(cp)
      i += 2
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return { ok: false, error: 'Lone low surrogate in UTF-16LE' }
    } else {
      text += String.fromCodePoint(unit)
    }
  }
  return { ok: true, text }
}
```

Wire into `encodeUtf` / `decodeUtf` for `utf-16le`.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- testing/unit/tools/utf-encoding/logic.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/utf-encoding/logic.ts testing/unit/tools/utf-encoding/logic.test.ts
git commit -m "$(cat <<'EOF'
feat(utf-encoding): add UTF-16LE encode and decode

EOF
)"
```

---

### Task 4: UTF-32LE encode / decode + BOM (TDD)

**Files:**
- Modify: `src/tools/utf-encoding/logic.ts`
- Modify: `testing/unit/tools/utf-encoding/logic.test.ts`

- [ ] **Step 1: Write failing UTF-32LE tests**

Append:

```ts
describe('utf-32le', () => {
  it('encodes ASCII without BOM', () => {
    expect(encodeUtf('A', 'utf-32le', false)).toBe('41 00 00 00')
  })

  it('encodes with BOM when requested', () => {
    expect(encodeUtf('A', 'utf-32le', true)).toBe('FF FE 00 00 41 00 00 00')
  })

  it('round-trips emoji', () => {
    const hex = encodeUtf('😀', 'utf-32le', false)
    const r = decodeUtf(hex, 'utf-32le', false)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.text).toBe('😀')
  })

  it('strips BOM on decode only when bom flag on', () => {
    const withBom = encodeUtf('A', 'utf-32le', true)
    const stripped = decodeUtf(withBom, 'utf-32le', true)
    expect(stripped.ok && stripped.text).toBe('A')
  })

  it('errors on truncated code point', () => {
    const r = decodeUtf('41 00', 'utf-32le', false)
    expect(r.ok).toBe(false)
  })

  it('errors on surrogate code point', () => {
    // U+D800 as UTF-32LE
    const r = decodeUtf('00 D8 00 00', 'utf-32le', false)
    expect(r.ok).toBe(false)
  })

  it('errors on out-of-range code point', () => {
    const r = decodeUtf('00 00 11 00', 'utf-32le', false) // 0x110000
    expect(r.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- testing/unit/tools/utf-encoding/logic.test.ts
```

Expected: FAIL (`encode not implemented: utf-32le` or similar).

- [ ] **Step 3: Implement UTF-32LE**

```ts
const UTF32_BOM = [0xff, 0xfe, 0x00, 0x00] as const

function encodeUtf32Le(text: string, bom: boolean): Uint8Array {
  const cps: number[] = []
  if (bom) cps.push(0xfeff)
  for (const ch of text) cps.push(ch.codePointAt(0)!)
  const out = new Uint8Array(cps.length * 4)
  for (let i = 0; i < cps.length; i++) {
    const cp = cps[i]!
    out[i * 4] = cp & 0xff
    out[i * 4 + 1] = (cp >> 8) & 0xff
    out[i * 4 + 2] = (cp >> 16) & 0xff
    out[i * 4 + 3] = (cp >> 24) & 0xff
  }
  return out
}

function decodeUtf32Le(bytes: Uint8Array, bom: boolean): UtfDecodeResult {
  let offset = 0
  if (
    bom &&
    bytes.length >= 4 &&
    bytes[0] === UTF32_BOM[0] &&
    bytes[1] === UTF32_BOM[1] &&
    bytes[2] === UTF32_BOM[2] &&
    bytes[3] === UTF32_BOM[3]
  ) {
    offset = 4
  }
  const slice = bytes.subarray(offset)
  if (slice.length % 4 !== 0) {
    return { ok: false, error: 'Truncated UTF-32LE (length not multiple of 4)' }
  }
  let text = ''
  for (let i = 0; i < slice.length; i += 4) {
    const cp =
      slice[i]! |
      (slice[i + 1]! << 8) |
      (slice[i + 2]! << 16) |
      (slice[i + 3]! << 24)
    // >>> 0 for unsigned
    const code = cp >>> 0
    if (code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
      return { ok: false, error: 'Invalid Unicode code point in UTF-32LE' }
    }
    text += String.fromCodePoint(code)
  }
  return { ok: true, text }
}
```

Wire into `encodeUtf` / `decodeUtf`. Remove remaining throws — all three encodings handled.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- testing/unit/tools/utf-encoding/logic.test.ts
```

Expected: PASS (full suite).

- [ ] **Step 5: Commit**

```bash
git add src/tools/utf-encoding/logic.ts testing/unit/tools/utf-encoding/logic.test.ts
git commit -m "$(cat <<'EOF'
feat(utf-encoding): add UTF-32LE encode and decode

EOF
)"
```

---

### Task 5: Tool UI (Base64 clone)

**Files:**
- Create: `src/tools/utf-encoding/UtfEncodingTool.tsx`

- [ ] **Step 1: Create `UtfEncodingTool.tsx`**

Mirror `src/tools/base64/Base64Tool.tsx` structure:

```tsx
import { useState } from 'react'
import { Copy, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ActionBar, IoGrid, IoPanel } from '@/tools/shared/IoPanels'
import {
  decodeUtf,
  encodeUtf,
  type UtfEncoding,
} from './logic'

export type UtfMode = 'encode' | 'decode'

export function UtfEncodingTool() {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<UtfMode>('encode')
  const [encoding, setEncoding] = useState<UtfEncoding>('utf-8')
  const [bom, setBom] = useState(false)
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const bomEnabled = encoding === 'utf-16le' || encoding === 'utf-32le'

  function run() {
    if (mode === 'encode') {
      setOutput(encodeUtf(input, encoding, bomEnabled && bom))
      setError(null)
    } else {
      const r = decodeUtf(input, encoding, bomEnabled && bom)
      if (r.ok) {
        setOutput(r.text)
        setError(null)
      } else {
        setOutput('')
        setError(r.error)
      }
    }
  }

  return (
    <div className="space-y-6">
      <IoGrid>
        <IoPanel
          title="Input"
          actions={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setInput('')
                setOutput('')
                setError(null)
              }}
            >
              <Trash2 /> Clear
            </Button>
          }
        >
          <Textarea
            aria-label="UTF encoding input"
            className="min-h-[300px] resize-none rounded-none border-0 font-mono focus-visible:ring-0 focus-visible:ring-offset-0"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </IoPanel>
        <IoPanel
          title="Output"
          actions={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!output}
              onClick={async () => {
                await navigator.clipboard.writeText(output)
                toast.success('Copied to clipboard')
              }}
            >
              <Copy /> Copy
            </Button>
          }
        >
          <Textarea
            aria-label="UTF encoding output"
            readOnly
            className="min-h-[300px] resize-none rounded-none border-0 bg-muted/30 font-mono focus-visible:ring-0 focus-visible:ring-offset-0"
            value={output}
          />
        </IoPanel>
      </IoGrid>
      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : null}
      <ActionBar>
        <label className="flex items-center gap-2 text-sm">
          Mode
          <select
            className="rounded-md border border-input bg-background px-2 py-1"
            value={mode}
            onChange={(e) => setMode(e.target.value as UtfMode)}
          >
            <option value="encode">Encode</option>
            <option value="decode">Decode</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Encoding
          <select
            className="rounded-md border border-input bg-background px-2 py-1"
            value={encoding}
            onChange={(e) => setEncoding(e.target.value as UtfEncoding)}
          >
            <option value="utf-8">UTF-8</option>
            <option value="utf-16le">UTF-16LE</option>
            <option value="utf-32le">UTF-32LE</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={bomEnabled && bom}
            disabled={!bomEnabled}
            onChange={(e) => setBom(e.target.checked)}
          />
          BOM
        </label>
        <Button type="button" onClick={run} disabled={!input.trim()}>
          Run
        </Button>
      </ActionBar>
    </div>
  )
}

export default UtfEncodingTool
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc -b --pretty false
```

Expected: OK (or only unrelated errors). Component unused until registry — fine.

- [ ] **Step 3: Commit**

```bash
git add src/tools/utf-encoding/UtfEncodingTool.tsx
git commit -m "$(cat <<'EOF'
feat(utf-encoding): add tool UI

EOF
)"
```

---

### Task 6: Register tool + docs

**Files:**
- Modify: `src/tools/types.ts`
- Modify: `src/tools/registry.ts`
- Modify: `testing/unit/tools/registry.test.ts`
- Create: `docs/features/utf-encoding.md`
- Modify: `docs/features/tool-registry.md`
- Modify: `docs/README.md`

- [ ] **Step 1: Update registry test expectations (fail first)**

In `testing/unit/tools/registry.test.ts`, change to eight tools and add `'utf-encoding'`:

```ts
  it('exposes exactly the expected eight tools', () => {
    const expected = [
      'json-formatter',
      'base64',
      'uuid',
      'hash-sha256',
      'unix-timestamp',
      'text-case',
      'pdf-to-image',
      'utf-encoding',
    ]
    expect(tools.map((t) => t.id).sort()).toEqual([...expected].sort())
  })
```

- [ ] **Step 2: Run registry test — expect FAIL**

```bash
npm test -- testing/unit/tools/registry.test.ts
```

Expected: FAIL (missing `utf-encoding`).

- [ ] **Step 3: Add `ToolId` + registry entry**

`src/tools/types.ts` — add `| 'utf-encoding'` to `ToolId`.

`src/tools/registry.ts` — append before closing `]`:

```ts
  {
    id: 'utf-encoding',
    title: 'UTF encoding',
    description:
      'Convert text to and from UTF-8, UTF-16LE, or UTF-32LE hex bytes.',
    component: lazy(() => import('./utf-encoding/UtfEncodingTool')),
  },
```

- [ ] **Step 4: Run registry + logic tests — expect PASS**

```bash
npm test -- testing/unit/tools/registry.test.ts testing/unit/tools/utf-encoding/logic.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write feature docs**

Create `docs/features/utf-encoding.md`:

```md
# Feature: UTF encoding

**Registry id:** `utf-encoding` · Route: `/tools/utf-encoding`

## Purpose

Convert plain text ↔ spaced hex byte dumps for UTF-8, UTF-16LE, and UTF-32LE in-browser.

## Behavior

- Mode: encode | decode
- Encoding: UTF-8 | UTF-16LE | UTF-32LE (one at a time)
- BOM checkbox (default off); enabled only for UTF-16LE / UTF-32LE
- Encode output: uppercase spaced hex
- Decode input: accept spaces, commas, `0x`, newlines; odd length → error
- Invalid sequences → inline error
- Output read-only textarea with Copy; Clear resets both panes

## Logic

Pure helpers in `logic.ts`: `parseHex`, `formatHex`, `encodeUtf`, `decodeUtf`.

## Tests

Mirror under `testing/unit/tools/utf-encoding/`.
```

Update `docs/features/tool-registry.md` registered-tools table — add `| \`utf-encoding\` | UTF encoding |`.

Update `docs/README.md` feature table — add `| \`features/utf-encoding.md\` | UTF encoding bi-converter |`.

Optionally add design-spec row for `2026-08-08-utf-encoding-design.md` and plan row for this file.

- [ ] **Step 6: Full unit suite**

```bash
npm test
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/tools/types.ts src/tools/registry.ts testing/unit/tools/registry.test.ts docs/features/utf-encoding.md docs/features/tool-registry.md docs/README.md
git commit -m "$(cat <<'EOF'
feat(utf-encoding): register tool and docs

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Text ↔ hex UTF-8/16LE/32LE | 2–4 |
| LE only | 3–4 |
| BOM toggle default off; UTF-8 ignore | 3–5 |
| Spaced uppercase hex; flexible parse | 1 |
| Base64-style UI + Run | 5 |
| Registry + feature doc + mirrored tests | 1–6 |
| Errors: odd hex, truncated, invalid UTF-8, lone surrogates, bad UTF-32 | 1–4 |
| No BE / live / multi-encoding / e2e | — (non-goals) |

## Type consistency

- `UtfEncoding = 'utf-8' | 'utf-16le' | 'utf-32le'`
- `encodeUtf(text, encoding, bom): string`
- `decodeUtf(hex, encoding, bom): UtfDecodeResult`
- `ToolId` includes `'utf-encoding'`
- Registry id / route / folder: `utf-encoding`
