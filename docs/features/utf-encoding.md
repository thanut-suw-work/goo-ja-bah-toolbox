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
