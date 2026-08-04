# Feature: Text case

**Registry id:** `text-case` · Route: `/tools/text-case`

## Purpose

Transform text casing in-browser.

## Behavior

- Mode selector: `lower`, `upper`, `title`, `camel`, `snake`
- Transform on button click → read-only output textarea
- Word splitting handles spaces, hyphens, underscores, and camelCase boundaries

## Logic

`transformCase(input, mode: CaseMode) → string`

## Tests

Mirror under `testing/unit/tools/text-case/`.
