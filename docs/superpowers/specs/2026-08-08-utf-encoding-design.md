# UTF Encoding Bi-Converter — Design Spec

Date: 2026-08-08  
Status: approved (brainstorm)  
Registry id: `utf-encoding` · Route: `/tools/utf-encoding`

## Summary

New toolbox tool: convert plain text ↔ hex byte dump for **UTF-8**, **UTF-16LE**, and **UTF-32LE** (one encoding at a time). UI mirrors Base64 (IoPanels + ActionBar + Run). Client-only; ephemeral React state only.

## Goals

- Bidirectional text ↔ spaced hex for the three LE UTF encodings
- Optional BOM on UTF-16LE / UTF-32LE (default off)
- Flexible hex paste on decode (spaces, commas, `0x`, newlines)
- Pure logic + mirrored Vitest coverage

## Non-goals

- Big-endian encodings
- Showing all three encodings at once
- Live convert-as-you-type
- Base64 / binary / `\u` escape views
- File upload or persistence
- UTF-8 BOM (BOM control applies only to UTF-16LE / UTF-32LE)

## Constraints

- Follow existing tool patterns (`IoGrid` / `IoPanel` / `ActionBar`, registry, feature doc, mirrored tests)
- Privacy: no network, no browser storage for tool I/O
- Stack: React + Vite + TypeScript; no new deps

## Approach (chosen)

**Base64 clone.** Input/Output panels; ActionBar with mode (encode|decode), encoding select, BOM checkbox (enabled only for UTF-16LE/UTF-32LE), Run button.

Rejected:

- Live convert — noisy errors on partial hex mid-edit
- Swap-direction panels — more state complexity; diverges from toolbox UX

## UI

| Control | Behavior |
|---------|----------|
| Input panel | Editable textarea; Clear resets input, output, error |
| Output panel | Read-only; Copy via clipboard + toast |
| Mode | Encode (text → hex) \| Decode (hex → text) |
| Encoding | UTF-8 \| UTF-16LE \| UTF-32LE |
| BOM | Checkbox, default off; disabled when encoding is UTF-8 |
| Run | Computes; disabled when input empty/whitespace-only |
| Error | Inline `role="alert"`; clears output on failure |

Encode output format: uppercase spaced hex (`48 65 6C 6C 6F`).

## Logic (`src/tools/utf-encoding/logic.ts`)

| Helper | Role |
|--------|------|
| `parseHex(input)` | Strip whitespace/commas/`0x`; require even length; → `Uint8Array` or error |
| `formatHex(bytes)` | Uppercase spaced hex string |
| `encodeUtf(text, encoding, bom)` | → hex string |
| `decodeUtf(hex, encoding, bom)` | → `{ ok: true, text }` \| `{ ok: false, error }` |

### Encode

- **UTF-8:** `TextEncoder`; ignore `bom`
- **UTF-16LE:** code points → UTF-16 code units → little-endian bytes; if `bom`, prepend `FF FE`
- **UTF-32LE:** code points → 32-bit LE; if `bom`, prepend `FF FE 00 00`

### Decode

- Parse hex first
- BOM strip rules: if `bom` on and bytes start with matching BOM → strip; if `bom` on and no BOM → decode as-is; if `bom` off → never strip (leading BOM bytes stay in payload)
- **UTF-8:** `TextDecoder('utf-8', { fatal: true })`
- **UTF-16LE:** pair bytes to code units; reject lone surrogates; assemble code points
- **UTF-32LE:** groups of 4 bytes; reject values outside `0..0x10FFFF` or surrogate range `0xD800..0xDFFF`
- Truncated sequences / invalid hex → clear error message

## Files

1. `docs/features/utf-encoding.md` — feature doc
2. `src/tools/utf-encoding/logic.ts` — pure helpers
3. `src/tools/utf-encoding/UtfEncodingTool.tsx` — UI
4. `src/tools/registry.ts` + `types.ts` — register `utf-encoding`
5. `testing/unit/tools/utf-encoding/` — unit tests
6. `docs/README.md` + `docs/features/tool-registry.md` — index updates

## Testing

Unit tests cover:

- Round-trip ASCII and non-BMP (e.g. emoji) for each encoding
- BOM on/off for UTF-16LE and UTF-32LE
- Hex parse variants (spaced, continuous, `0x`, commas)
- Odd-length hex, truncated UTF-16/32, invalid UTF-8, lone surrogates

No dedicated e2e required (single-step like Base64).

## Data flow

1. User picks mode + encoding (+ BOM if applicable)
2. Pastes input → Run
3. Logic returns hex/text or error
4. Navigate away / refresh → state gone
