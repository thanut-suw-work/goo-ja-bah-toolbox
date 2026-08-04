# Feature: Base64

**Registry id:** `base64` · Route: `/tools/base64`

## Purpose

Encode and decode Base64 strings in-browser.

## Behavior

- Mode: encode | decode
- UTF-8 via `TextEncoder` / `TextDecoder`; decode strips whitespace before parsing
- Invalid decode input → inline error
- Output in read-only textarea (manual select/copy)

## Logic

Pure helpers: `encodeBase64(text)`, `decodeBase64(b64) → { ok, text, error }`.

## Tests

Mirror under `testing/unit/tools/base64/`.
