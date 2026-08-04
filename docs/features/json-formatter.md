# Feature: JSON formatter

**Registry id:** `json-formatter` · Route: `/tools/json-formatter`

## Purpose

Format JSON text entirely in-browser with pretty-print or minify modes.

## Behavior

- Textarea input → validate → pretty-print or minify (mode selector)
- Invalid JSON → inline error; input is preserved
- Output shown in read-only textarea (manual select/copy; no auto-clipboard)

## Logic

Pure function: `formatJson(input, mode: 'pretty' | 'minify') → { ok, text, error }`.

## Tests

Mirror under `testing/unit/tools/json-formatter/`.
