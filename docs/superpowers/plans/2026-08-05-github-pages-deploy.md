# GitHub Pages Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy GJB Toolbox static Vite build to GitHub Pages from Actions on `main`, with Vitest gate and correct project-path base/basename.

**Architecture:** Official Pages Actions (`upload-pages-artifact` + `deploy-pages`). CI sets `VITE_BASE=/goo-ja-bah-toolbox/`. App uses Vite `base` + React Router `basename` (trailing slash stripped). Build copies `index.html` → `404.html` for SPA deep links.

**Tech Stack:** GitHub Actions · Vite · React Router · Vitest · GitHub Pages

**Spec:** `docs/superpowers/specs/2026-08-05-github-pages-deploy-design.md`  
**Agent entry:** `AGENTS.md` → `docs/README.md`

---

## File map

| Path | Action |
|------|--------|
| `src/app/routerBasename.ts` | Create — strip trailing `/` from Vite `BASE_URL` for React Router |
| `testing/unit/app/routerBasename.test.ts` | Create — unit tests for helper |
| `src/app/App.tsx` | Modify — pass `basename={routerBasename()}` |
| `vite.config.ts` | Modify — `base: process.env.VITE_BASE ?? '/'` |
| `.github/workflows/deploy-pages.yml` | Create — test → build → deploy |
| `docs/architecture.md` | Modify — Deploy section |
| `docs/README.md` | Modify — when→read deploy row + plan index |

Do not touch `ui-prototype/`. Do not add e2e to CI. Do not use HashRouter or `gh-pages` branch.

---

### Task 1: `routerBasename` helper (TDD)

**Files:**
- Create: `testing/unit/app/routerBasename.test.ts`
- Create: `src/app/routerBasename.ts`

- [ ] **Step 1: Write the failing test**

```ts
// testing/unit/app/routerBasename.test.ts
import { describe, it, expect } from 'vitest'
import { routerBasename } from '@/app/routerBasename'

describe('routerBasename', () => {
  it('returns empty string for root base', () => {
    expect(routerBasename('/')).toBe('')
  })

  it('strips trailing slash from project base', () => {
    expect(routerBasename('/goo-ja-bah-toolbox/')).toBe('/goo-ja-bah-toolbox')
  })

  it('leaves already-clean path unchanged', () => {
    expect(routerBasename('/goo-ja-bah-toolbox')).toBe('/goo-ja-bah-toolbox')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- testing/unit/app/routerBasename.test.ts`

Expected: FAIL — cannot resolve `@/app/routerBasename` (or module not found)

- [ ] **Step 3: Write minimal implementation**

```ts
// src/app/routerBasename.ts
/** Vite BASE_URL ends with `/`; React Router basename must not. */
export function routerBasename(baseUrl: string): string {
  if (baseUrl === '/') return ''
  return baseUrl.replace(/\/$/, '')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- testing/unit/app/routerBasename.test.ts`

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add testing/unit/app/routerBasename.test.ts src/app/routerBasename.ts
git commit -m "$(cat <<'EOF'
feat(app): add routerBasename helper for Vite base

EOF
)"
```

---

### Task 2: Wire Vite `base` + App `basename`

**Files:**
- Modify: `vite.config.ts`
- Modify: `src/app/App.tsx`

- [ ] **Step 1: Update `vite.config.ts`**

Replace the full file contents with:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 2: Update `src/app/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './AppShell'
import { HomePage } from './HomePage'
import { ToolPage } from './ToolPage'
import { NotFoundPage } from './NotFoundPage'
import { routerBasename } from './routerBasename'

export function App() {
  return (
    <BrowserRouter basename={routerBasename(import.meta.env.BASE_URL)}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="tools/:id" element={<ToolPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Run full unit suite**

Run: `npm test`

Expected: all existing tests + `routerBasename` PASS

- [ ] **Step 4: Verify local build with project base**

Run:

```bash
VITE_BASE=/goo-ja-bah-toolbox/ npm run build
test -f dist/index.html
grep -q '/goo-ja-bah-toolbox/' dist/index.html
```

Expected: build succeeds; `dist/index.html` references assets under `/goo-ja-bah-toolbox/`

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts src/app/App.tsx
git commit -m "$(cat <<'EOF'
feat: set Vite base and router basename for Pages

EOF
)"
```

---

### Task 3: GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy-pages.yml`

- [ ] **Step 1: Create workflow directory and file**

```bash
mkdir -p .github/workflows
```

Write `.github/workflows/deploy-pages.yml` exactly:

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    env:
      VITE_BASE: /goo-ja-bah-toolbox/
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: npm
      - run: npm ci
      - run: npm run build
      - name: SPA 404 fallback
        run: cp dist/index.html dist/404.html
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Notes for the implementer:
- `upload-pages-artifact@v4` + `deploy-pages@v4` match current GitHub Docs examples; `configure-pages@v5` is current.
- Do not put secrets in the workflow; OIDC + `GITHUB_TOKEN` handle Pages.

- [ ] **Step 2: Sanity-check YAML locally (optional)**

Run: `python -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-pages.yml'))"`  
If PyYAML missing, skip — GitHub will validate on push.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy-pages.yml
git commit -m "$(cat <<'EOF'
ci: add GitHub Pages deploy workflow

EOF
)"
```

---

### Task 4: Docs — architecture + agent index

**Files:**
- Modify: `docs/architecture.md`
- Modify: `docs/README.md`

- [ ] **Step 1: Append Deploy section to `docs/architecture.md`**

Add at end of file (after Privacy coupling):

```markdown
## Deploy

- Host: **GitHub Pages** (project site)
- URL: `https://thanut-suw-work.github.io/goo-ja-bah-toolbox/`
- CI: `.github/workflows/deploy-pages.yml` — Vitest → Vite build → Pages
- Build sets `VITE_BASE=/goo-ja-bah-toolbox/` so asset URLs include the project path
- App uses `BrowserRouter` with `basename` from `routerBasename(import.meta.env.BASE_URL)`
- SPA deep links: CI copies `dist/index.html` → `dist/404.html` so Pages serves the shell for unknown paths
- One-time repo setting: **Settings → Pages → Source = GitHub Actions**
- Local default base remains `/` unless `VITE_BASE` is set
```

- [ ] **Step 2: Update `docs/README.md` when→read table**

Add this row after the “Revisiting product decisions” row:

```markdown
| Deploying / changing Pages CI or Vite `base` | `architecture.md` (Deploy), `superpowers/specs/2026-08-05-github-pages-deploy-design.md` |
```

- [ ] **Step 3: Update `docs/README.md` implementation plans table**

Add if missing (may already be present from plan authoring):

```markdown
| `superpowers/plans/2026-08-05-github-pages-deploy.md` | GitHub Pages via Actions (test gate, project base, SPA 404) |
```

- [ ] **Step 4: Commit**

```bash
git add docs/architecture.md docs/README.md
git commit -m "$(cat <<'EOF'
docs: document GitHub Pages deploy

EOF
)"
```

---

### Task 5: Human ops reminder + local SPA 404 check

**Files:** none (verification only)

- [ ] **Step 1: Confirm 404 copy works after project-base build**

Run:

```bash
VITE_BASE=/goo-ja-bah-toolbox/ npm run build
cp dist/index.html dist/404.html
cmp dist/index.html dist/404.html
```

Expected: `cmp` silent (files identical)

- [ ] **Step 2: Tell the human (do not automate)**

After these commits are on `origin/main`:

1. Repo → **Settings → Pages → Source = GitHub Actions**
2. Wait for workflow green
3. Verify checklist from spec:
   - Site loads at `https://thanut-suw-work.github.io/goo-ja-bah-toolbox/`
   - Home → tool nav works
   - Hard refresh on a tool URL works

- [ ] **Step 3: No commit** (ops note only)

If the implementer pushes: `git push -u origin HEAD` only when the user explicitly asked to push.

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Official Pages Actions | Task 3 |
| Push `main` + `workflow_dispatch` | Task 3 |
| Permissions + concurrency | Task 3 |
| Vitest before build/deploy | Task 3 |
| `VITE_BASE=/goo-ja-bah-toolbox/` | Tasks 2–3 |
| Vite `base` from env | Task 2 |
| Router basename, trailing slash stripped | Tasks 1–2 |
| `404.html` SPA fallback | Tasks 3, 5 |
| Docs architecture + README index | Task 4 |
| One-time Pages source setting | Task 5 |
| No e2e / HashRouter / gh-pages branch | Out of scope (not in any task) |
