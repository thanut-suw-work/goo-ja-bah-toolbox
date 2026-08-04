# Feature: UUID

**Registry id:** `uuid` · Route: `/tools/uuid`

## Purpose

Generate UUID v4 identifiers in-browser via `crypto.randomUUID`.

## Behavior

- Generate 1–100 UUIDs (count input clamped in logic)
- Output: one UUID per line in read-only textarea
- No persistence of generated values

## Logic

`generateUuids(count) → string[]`

## Tests

Mirror under `testing/unit/tools/uuid/`.
