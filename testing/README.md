# Testing

## Layout

Root `testing/` mirrors application structure:

```
testing/
  unit/     # mirrors src/ (e.g. testing/unit/tools/json-formatter/...)
  e2e/      # user flows / routes
  README.md
```

## Stack

- **Vitest** — unit tests (jsdom when DOM required)
- **Playwright** — e2e against Vite dev or preview

## Rules

- Prefer pure functions in tool modules so unit tests avoid full page mounts
- New tool → add mirrored unit tests under `testing/unit/tools/<id>/`
- Non-trivial user flows → e2e under `testing/e2e/`
- A feature is not done without tests for its logic (and e2e when the flow is the point)

## Commands (fill in after scaffold)

```bash
# unit
npm test          # or: npx vitest

# e2e
npx playwright test
```
