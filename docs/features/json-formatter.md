# Feature: JSON formatter

## Purpose

Format / prettify (and optionally minify) JSON text entirely in-browser.

## Behavior

- Textarea input → validate → pretty-print or minify
- Invalid JSON → inline error; do not clear input
- Copy result via explicit user action only

## Logic

Pure functions preferred: `formatJson(input, mode) → { ok, text, error }`.

## Tests

Mirror under `testing/unit/tools/json-formatter/`.
