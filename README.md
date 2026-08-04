# GJB Toolbox

Fast CSR browser utilities. Local-only. No tracking. No persistence.

## Setup

```bash
npm install
```

## Scripts

```bash
npm run dev         # Vite dev server
npm run build       # Typecheck + production build
npm run preview     # Preview production build
npm test            # Unit tests (Vitest, run once)
npm run test:watch  # Vitest watch mode
npm run test:e2e    # Playwright e2e (build + preview via webServer)
npm run lint        # oxlint
```

## E2E setup (one-time)

Playwright needs a browser binary before the first e2e run:

```bash
npx playwright install chromium
npm run test:e2e
```

## Docs

- Agent entry: [`AGENTS.md`](./AGENTS.md)
- Docs index: [`docs/README.md`](./docs/README.md)
- Design: [`docs/superpowers/specs/2026-08-05-gjb-toolbox-design.md`](./docs/superpowers/specs/2026-08-05-gjb-toolbox-design.md)
- UI tokens: [`PRODUCT.md`](./PRODUCT.md), [`DESIGN.md`](./DESIGN.md)
