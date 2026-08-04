# Feature: Unix timestamp

**Registry id:** `unix-timestamp` · Route: `/tools/unix-timestamp`

## Purpose

Convert between Unix seconds and ISO UTC date/time in-browser.

## Behavior

- **Unix seconds → ISO UTC:** numeric seconds input → `toISOString()` output
- **ISO UTC → Unix seconds:** ISO string input → floored Unix seconds
- Invalid input → inline error per direction
- UI labels document UTC (ISO output always ends with `Z`)

## Logic

- `timestampToIsoUtc(seconds) → { ok, iso, error }`
- `isoToUnixSeconds(iso) → { ok, seconds, error }`

## Tests

Mirror under `testing/unit/tools/unix-timestamp/`.
