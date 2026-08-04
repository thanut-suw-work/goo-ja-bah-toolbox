# Feature: UUID

## Purpose

Generate UUIDs in-browser (prefer `crypto.randomUUID` when available).

## Behavior

- Generate one or many UUIDs
- Copy via explicit user action
- No persistence of generated values

## Tests

Mirror under `testing/unit/tools/uuid/` (mock crypto if needed).
