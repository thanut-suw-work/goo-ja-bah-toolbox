# UTF Encoding Code Points Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `code-points` encoding on the existing UTF tool so text ↔ unpadded `0x` Unicode scalar tokens (`testtt อิ` → `0x74 0x65 0x73 0x74 0x74 0x74 0x20 0xE2D 0xE34`).

**Architecture:** New pure helpers `formatCodePoints` / `parseCodePoints` in `src/tools/utf-encoding/logic.ts`. Extend `UtfEncoding` with `'code-points'`. `decodeUtf` must branch **before** byte `parseHex` (token parse, not nibble pairs). UI adds one `<option>`; BOM already disabled unless UTF-16LE/UTF-32LE. Title/route unchanged.

**Tech Stack:** React 19 · Vite · TypeScript · Vitest · existing `IoPanels` / shadcn Button/Textarea. No new deps.

**Spec:** `docs/superpowers/specs/2026-08-11-utf-code-points-design.md`

---

## Error policy (locked)

`parseCodePoints` returns `{ ok: false, error }` with these **exact** strings:

| Case | `error` |
|------|---------|
| No tokens after split on `/[\s,]+/` | `Empty code point input` |
| Empty after stripping `0x`/`0X`, or non-hex | `Invalid hex characters` |
| Value `> 0x10FFFF` | `Invalid Unicode code point` |
| `0xD800`–`0xDFFF` | `Surrogate code point` |

Do not reuse `parseHex` for this mode.

---

## File map

**Modify:**
```
src/tools/utf-encoding/logic.ts
testing/unit/tools/utf-encoding/logic.test.ts
src/tools/utf-encoding/UtfEncodingTool.tsx
src/tools/registry.ts
```

**Already updated (do not rewrite unless implementation drifted):**
```
docs/superpowers/specs/2026-08-11-utf-code-points-design.md
docs/superpowers/specs/2026-08-08-utf-encoding-design.md
docs/features/utf-encoding.md
docs/README.md
```

**Do not modify:** `src/tools/types.ts` (no new `ToolId`), `docs/features/tool-registry.md` (title unchanged), `package.json`.

---

### Task 1: `formatCodePoints` / `parseCodePoints` (TDD)

**Files:**
- Modify: `testing/unit/tools/utf-encoding/logic.test.ts`
- Modify: `src/tools/utf-encoding/logic.ts`

- [ ] **Step 1: Write failing tests**

Append to `testing/unit/tools/utf-encoding/logic.test.ts` (keep existing `formatHex` / UTF-* describes):

```ts
import {
  decodeUtf,
  encodeUtf,
  formatCodePoints,
  formatHex,
  parseCodePoints,
  parseHex,
} from '@/tools/utf-encoding/logic'

describe('formatCodePoints / parseCodePoints', () => {
  it('formats unpadded uppercase 0x tokens', () => {
    expect(formatCodePoints('testtt อิ')).toBe(
      '0x74 0x65 0x73 0x74 0x74 0x74 0x20 0xE2D 0xE34',
    )
  })

  it('formats emoji as a scalar not surrogates', () => {
    expect(formatCodePoints('😀')).toBe('0x1F600')
  })

  it('formats NUL as 0x0', () => {
    expect(formatCodePoints('\0')).toBe('0x0')
  })

  it('parses padded, unpadded, commas, and missing 0x', () => {
    const a = parseCodePoints('0x74 0xE2D')
    const b = parseCodePoints('0x0E2D')
    const c = parseCodePoints('74,e2d')
    const d = parseCodePoints('0x74\n0x65')
    expect(a.ok && b.ok && c.ok && d.ok).toBe(true)
    if (a.ok && b.ok && c.ok && d.ok) {
      expect(a.codePoints).toEqual([0x74, 0xe2d])
      expect(b.codePoints).toEqual([0xe2d])
      expect(c.codePoints).toEqual([0x74, 0xe2d])
      expect(d.codePoints).toEqual([0x74, 0x65])
    }
  })

  it('errors on empty input', () => {
    const r = parseCodePoints('   ,  ')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('Empty code point input')
  })

  it('errors on non-hex and lone 0x', () => {
    const a = parseCodePoints('0xzz')
    const b = parseCodePoints('0x')
    expect(a.ok).toBe(false)
    expect(b.ok).toBe(false)
    if (!a.ok) expect(a.error).toBe('Invalid hex characters')
    if (!b.ok) expect(b.error).toBe('Invalid hex characters')
  })

  it('errors on out-of-range and surrogates', () => {
    const a = parseCodePoints('0x110000')
    const b = parseCodePoints('0xD800')
    expect(a.ok).toBe(false)
    expect(b.ok).toBe(false)
    if (!a.ok) expect(a.error).toBe('Invalid Unicode code point')
    if (!b.ok) expect(b.error).toBe('Surrogate code point')
  })
})
```

Update the import at the top of the test file to include `formatCodePoints` and `parseCodePoints` (do not duplicate the import block).

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- testing/unit/tools/utf-encoding/logic.test.ts
```

Expected: FAIL — `formatCodePoints` / `parseCodePoints` not exported.

- [ ] **Step 3: Implement helpers**

In `src/tools/utf-encoding/logic.ts`, add after `parseHex` (do **not** change `UtfEncoding` yet):

```ts
export type CodePointParseResult =
  | { ok: true; codePoints: number[] }
  | { ok: false; error: string }

export function formatCodePoints(text: string): string {
  return [...text]
    .map((ch) => '0x' + ch.codePointAt(0)!.toString(16).toUpperCase())
    .join(' ')
}

export function parseCodePoints(input: string): CodePointParseResult {
  const tokens = input.split(/[\s,]+/).filter((t) => t.length > 0)
  if (tokens.length === 0) {
    return { ok: false, error: 'Empty code point input' }
  }
  const codePoints: number[] = []
  for (const raw of tokens) {
    const s = raw.replace(/^0x/i, '')
    if (s.length === 0 || !/^[0-9a-fA-F]+$/.test(s)) {
      return { ok: false, error: 'Invalid hex characters' }
    }
    const cp = Number.parseInt(s, 16)
    if (cp > 0x10ffff) {
      return { ok: false, error: 'Invalid Unicode code point' }
    }
    if (cp >= 0xd800 && cp <= 0xdfff) {
      return { ok: false, error: 'Surrogate code point' }
    }
    codePoints.push(cp)
  }
  return { ok: true, codePoints }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- testing/unit/tools/utf-encoding/logic.test.ts
```

Expected: PASS (existing UTF-* tests still pass).

- [ ] **Step 5: Commit**

```bash
git add src/tools/utf-encoding/logic.ts testing/unit/tools/utf-encoding/logic.test.ts
git commit -m "$(cat <<'EOF'
feat(utf-encoding): add code-point hex parse and format

EOF
)"
```

---

### Task 2: Wire `encodeUtf` / `decodeUtf` (TDD)

**Files:**
- Modify: `testing/unit/tools/utf-encoding/logic.test.ts`
- Modify: `src/tools/utf-encoding/logic.ts`

- [ ] **Step 1: Write failing encode/decode tests**

Append:

```ts
describe('code-points', () => {
  it('encodes the Thai sample', () => {
    expect(encodeUtf('testtt อิ', 'code-points', false)).toBe(
      '0x74 0x65 0x73 0x74 0x74 0x74 0x20 0xE2D 0xE34',
    )
  })

  it('round-trips ASCII, Thai, and emoji', () => {
    for (const text of ['Hi', 'testtt อิ', '😀']) {
      const hex = encodeUtf(text, 'code-points', false)
      const r = decodeUtf(hex, 'code-points', false)
      expect(r.ok).toBe(true)
      if (r.ok) expect(r.text).toBe(text)
    }
  })

  it('decodes padded 0x0E2D', () => {
    const r = decodeUtf('0x0E2D', 'code-points', false)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.text).toBe('อ')
  })

  it('ignores bom flag', () => {
    expect(encodeUtf('A', 'code-points', true)).toBe('0x41')
  })

  it('does not use byte parseHex (odd nibble token is a scalar)', () => {
    const r = decodeUtf('0xE2D', 'code-points', false)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.text).toBe('อ')
  })

  it('surfaces parse errors', () => {
    const r = decodeUtf('0xD800', 'code-points', false)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('Surrogate code point')
  })
})
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npm test -- testing/unit/tools/utf-encoding/logic.test.ts
```

Expected: FAIL — `'code-points'` not in `UtfEncoding`.

- [ ] **Step 3: Extend the union and branch**

Change the type:

```ts
export type UtfEncoding = 'utf-8' | 'utf-16le' | 'utf-32le' | 'code-points'
```

In `encodeUtf`, add **before** the `_exhaustive` assignment:

```ts
  if (encoding === 'code-points') {
    void bom
    return formatCodePoints(text)
  }
```

In `decodeUtf`, handle code points **before** `parseHex` (byte parse would reject `0xE2D` as odd length):

```ts
export function decodeUtf(
  hex: string,
  encoding: UtfEncoding,
  bom: boolean,
): UtfDecodeResult {
  if (encoding === 'code-points') {
    void bom
    const parsed = parseCodePoints(hex)
    if (!parsed.ok) return parsed
    let text = ''
    for (const cp of parsed.codePoints) {
      text += String.fromCodePoint(cp)
    }
    return { ok: true, text }
  }
  const parsed = parseHex(hex)
  if (!parsed.ok) return parsed
  const bytes = parsed.bytes
  // existing utf-8 / utf-16le / utf-32le branches unchanged
```

Keep the existing UTF-* branches and `_exhaustive` check after that.

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- testing/unit/tools/utf-encoding/logic.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tools/utf-encoding/logic.ts testing/unit/tools/utf-encoding/logic.test.ts
git commit -m "$(cat <<'EOF'
feat(utf-encoding): encode and decode Unicode code points

EOF
)"
```

---

### Task 3: Encoding `<option>`

**Files:**
- Modify: `src/tools/utf-encoding/UtfEncodingTool.tsx`

- [ ] **Step 1: Add the option**

In the Encoding `<select>`, after UTF-32LE:

```tsx
            <option value="utf-8">UTF-8</option>
            <option value="utf-16le">UTF-16LE</option>
            <option value="utf-32le">UTF-32LE</option>
            <option value="code-points">Code points</option>
```

Do **not** change `bomEnabled`. It is already:

```ts
  const bomEnabled = encoding === 'utf-16le' || encoding === 'utf-32le'
```

so Code points disables BOM like UTF-8. `setEncoding(e.target.value as UtfEncoding)` picks up the new union member from `logic.ts`.

- [ ] **Step 2: Typecheck**

```bash
npx tsc -b --pretty false
```

Expected: no errors (`UtfEncoding` includes `'code-points'`).

- [ ] **Step 3: Commit**

```bash
git add src/tools/utf-encoding/UtfEncodingTool.tsx
git commit -m "$(cat <<'EOF'
feat(utf-encoding): add Code points encoding option

EOF
)"
```

---

### Task 4: Registry blurb

**Files:**
- Modify: `src/tools/registry.ts`

Feature doc, README, and specs are **already** updated. Do not rewrite them. Only change the home-card description.

- [ ] **Step 1: Update description**

In `src/tools/registry.ts` for `id: 'utf-encoding'`:

```ts
    description:
      'Convert text to and from UTF-8, UTF-16LE, UTF-32LE hex bytes, or Unicode code points.',
```

- [ ] **Step 2: Run unit tests**

```bash
npm test -- testing/unit/tools/utf-encoding/logic.test.ts testing/unit/tools/registry.test.ts
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/tools/registry.ts
git commit -m "$(cat <<'EOF'
docs(utf-encoding): mention code points in registry blurb

EOF
)"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Fourth option `code-points` / label Code points | 3 |
| Title/route unchanged | (no types/registry id task) |
| Unpadded uppercase `0x` encode | 1–2 |
| Thai sample exact string | 1–2 |
| Emoji `0x1F600` | 1 |
| Decode padded / optional `0x` / commas | 1–2 |
| Errors: empty, non-hex, `>10FFFF`, surrogates | 1–2 |
| `decodeUtf` not via `parseHex` | 2 |
| BOM ignored | 2–3 |
| Feature docs | already written; registry blurb in 4 |
| No e2e / no new tool | file map |

No placeholders. Names match: `formatCodePoints`, `parseCodePoints`, `'code-points'`.
