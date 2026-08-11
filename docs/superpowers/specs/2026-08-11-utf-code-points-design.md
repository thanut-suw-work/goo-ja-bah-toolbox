# UTF Encoding — Code Points Mode — Design Spec

Date: 2026-08-11  
Status: approved (brainstorm)  
Parent: `docs/superpowers/specs/2026-08-08-utf-encoding-design.md`  
Registry id: `utf-encoding` · Route: `/tools/utf-encoding` (unchanged)

## Summary

Add a fourth encoding on the existing UTF encoding tool: **Unicode code points** as space-separated `0x` hex tokens. Not a UTF byte encoding. Tool title and route stay.

Example: `testtt อิ` → `0x74 0x65 0x73 0x74 0x74 0x74 0x20 0xE2D 0xE34`

## Goals

- Encode: one `0x` token per Unicode scalar value (code point), uppercase, **no leading-zero pad**
- Decode: reverse; optional `0x`/`0X` per token; padded input (`0x0E2D`) accepted
- BOM ignored (checkbox disabled, same as UTF-8)
- Pure helpers + mirrored Vitest coverage

## Non-goals

- Renaming the tool or changing the registry id / route
- Mixed ASCII-keep format (`testtt 0xE2D 0xE34`)
- Concatenated undelimited blobs (`7465E2D` as many code points)
- `\u` / `\x` / `U+` output dialects
- Big-endian UTF, UTF-8 BOM, new tool, new dependencies

## Constraints

- Same UI chrome (IoGrid / IoPanel / ActionBar, Run, Copy, Clear)
- Privacy: no network, no browser storage
- Do not change `parseHex` / `formatHex` byte-dump behavior

## Approach (chosen)

**Same tool, fourth `<option>`.** Value `code-points`, label `Code points`. Keep title “UTF encoding”.

Rejected: rename tool; new registry entry.

## UI

| Control | Behavior |
|---------|----------|
| Encoding | UTF-8 \| UTF-16LE \| UTF-32LE \| **Code points** |
| BOM | Disabled when encoding is `utf-8` **or** `code-points` |
| Mode / Run / Copy / Clear / error | Unchanged |

Home card title stays `UTF encoding`. Registry description may mention code points.

## Format

Encode walks **code points** (`for (const ch of text)` / `[...text]`), not UTF-16 code units.

| Input | Encode output |
|-------|----------------|
| `Hi` | `0x48 0x69` |
| `testtt อิ` | `0x74 0x65 0x73 0x74 0x74 0x74 0x20 0xE2D 0xE34` |
| `😀` | `0x1F600` |
| `U+0000` | `0x0` |

Rules:

- Prefix `0x` on every token
- Hex digits uppercase
- No pad (`0xE2D` not `0x0E2D`; `0x74` not `0x074`)
- One space between tokens
- BMP and non-BMP scalars (emoji is `0x1F600`, not surrogate pair)

## Decode

Token parse — **not** byte `parseHex`.

1. Split on whitespace and commas (`/[\s,]+/`); drop empty tokens
2. Strip optional leading `0x` / `0X` per token
3. Remaining must be `[0-9a-fA-F]+`
4. `parseInt(token, 16)` → one code point
5. `0x0E2D` and `0xE2D` both → U+0E2D
6. `74` without prefix is allowed (same value as `0x74`)
7. One undelimited token is **one** code point (so `7465E2D` is not “t e อ”)

### Exact error messages

| Case | `error` string |
|------|----------------|
| No tokens after split | `Empty code point input` |
| Empty after stripping `0x`, or non-hex | `Invalid hex characters` |
| Value `> 0x10FFFF` | `Invalid Unicode code point` |
| `0xD800`–`0xDFFF` | `Surrogate code point` |

Fail → clear output, `role="alert"` (existing UI).

`U+0000` (`0x0`) is valid.

## Logic (`src/tools/utf-encoding/logic.ts`)

Extend:

```ts
export type UtfEncoding = 'utf-8' | 'utf-16le' | 'utf-32le' | 'code-points'
```

| Helper | Role |
|--------|------|
| `formatCodePoints(text)` | → `0x…` string |
| `parseCodePoints(input)` | → `{ ok: true, codePoints }` \| `{ ok: false, error }` |
| `encodeUtf` / `decodeUtf` | branch on `'code-points'`; ignore `bom` |

Decode success: `String.fromCodePoint` each value (loop, not a giant spread).

Existing UTF-8 / UTF-16LE / UTF-32LE paths unchanged.

## Files

1. `src/tools/utf-encoding/logic.ts` — helpers + union
2. `src/tools/utf-encoding/UtfEncodingTool.tsx` — option + BOM disable
3. `testing/unit/tools/utf-encoding/logic.test.ts` — new cases
4. `src/tools/registry.ts` — description blurb
5. `docs/features/utf-encoding.md` — feature doc
6. This spec + parent spec pointer
7. `docs/README.md` — index row

No new route, no e2e.

## Testing

Unit tests:

- Encode `testtt อิ` exact string above
- Round-trip ASCII, Thai cluster, emoji
- Decode padded `0x0E2D` → อ
- Decode mixed separators (`0x74,0x65` and newlines)
- Decode without `0x` prefix (`74 65`)
- Ignore `bom` on encode (`A` → `0x41`)
- Reject surrogate, `0x110000`, `zz`, empty, lone `0x`

Existing byte-hex tests must still pass.

## Data flow

1. User picks Code points (+ encode/decode)
2. Run → `encodeUtf` / `decodeUtf` with `'code-points'`
3. Hex tokens or text, or alert
4. Navigate / refresh → state gone
