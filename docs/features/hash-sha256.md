# Feature: Hash (SHA-256)

## Purpose

Hash text with SHA-256 using Web Crypto; show hex digest.

## Behavior

- Input text → async digest → hex output
- Empty input → gentle inline guidance
- Copy via explicit user action

## Tests

Mirror under `testing/unit/tools/hash-sha256/` (mock `crypto.subtle` if needed).
