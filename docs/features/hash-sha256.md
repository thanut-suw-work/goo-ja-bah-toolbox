# Feature: Hash (SHA-256)

**Registry id:** `hash-sha256` · Route: `/tools/hash-sha256`

## Purpose

Hash text with SHA-256 using Web Crypto; show lowercase hex digest.

## Behavior

- Input text → async digest on button click → hex output
- Empty input → valid hash of empty string (standard SHA-256)
- Output in read-only textarea (manual select/copy)

## Logic

`sha256Hex(text) → Promise<string>` (Web Crypto `crypto.subtle.digest`)

## Tests

Mirror under `testing/unit/tools/hash-sha256/`.
