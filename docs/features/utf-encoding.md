# Feature: UTF encoding

**Registry id:** `utf-encoding` · Route: `/tools/utf-encoding`

## Purpose

Convert plain text ↔ spaced hex for UTF-8, UTF-16LE, UTF-32LE **byte dumps**, and Unicode **code points** (`0x…`), in-browser.

## Behavior

- Mode: encode | decode
- Encoding: UTF-8 | UTF-16LE | UTF-32LE | Code points (one at a time)
- BOM checkbox (default off); enabled only for UTF-16LE / UTF-32LE
- Encode (UTF-*): uppercase spaced byte hex (`48 65 6C`)
- Encode (Code points): `0x` + unpadded uppercase hex per scalar (`0x74 0xE2D 0x1F600`)
- Decode (UTF-*): accept spaces, commas, `0x`, newlines; odd nibble length → error
- Decode (Code points): token parse (whitespace/commas); optional `0x` per token; one token = one scalar; padded `0x0E2D` OK
- Invalid sequences / bad tokens / surrogates / `> 0x10FFFF` → inline error
- Output read-only textarea with Copy; Clear resets both panes

## Logic

Pure helpers in `logic.ts`: `parseHex`, `formatHex`, `parseCodePoints`, `formatCodePoints`, `encodeUtf`, `decodeUtf`.

## Tests

Mirror under `testing/unit/tools/utf-encoding/`.
