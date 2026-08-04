# GitHub Pages deploy via Actions — Design Spec

Date: 2026-08-05  
Status: approved (brainstorm)  
Product: **GJB Toolbox**

## Summary

Deploy the Vite CSR static build to **GitHub Pages** from **GitHub Actions** on every push to `main`. Site URL is the project Pages path. Unit tests must pass before build/deploy.

## Goals

- Automatic publish of `main` to GitHub Pages
- Correct asset + router paths under the project subdirectory
- SPA deep links / hard refresh work on Pages
- Fail closed: no deploy if unit tests fail

## Non-goals

- Custom domain
- Cloudflare / Netlify / other hosts
- Playwright e2e in the deploy workflow
- `gh-pages` branch publishing
- HashRouter

## Constraints

- Repo: `thanut-suw-work/goo-ja-bah-toolbox`
- Public URL: `https://thanut-suw-work.github.io/goo-ja-bah-toolbox/`
- Stack unchanged: React + Vite + TypeScript, client-only static assets
- Privacy / no-persistence rules unchanged

## Chosen approach

**Official Pages Actions** (`actions/upload-pages-artifact` + `actions/deploy-pages`) with Vite `base` and `BrowserRouter` `basename` set to the project path. Copy `index.html` → `404.html` in `dist` so GitHub Pages returns the SPA shell for unknown paths (deep links).

Rejected:

- `peaceiris/actions-gh-pages` / `gh-pages` branch — extra branch noise; superseded by official Actions flow
- HashRouter — uglier URLs; design already uses path routes

## Architecture

```
push main / workflow_dispatch
  └─ GitHub Actions
       ├─ test   → npm ci → npm test (Vitest)
       ├─ build  → needs test → VITE_BASE=/goo-ja-bah-toolbox/ → npm run build
       │            → cp dist/index.html dist/404.html
       │            → upload-pages-artifact (path: dist)
       └─ deploy → needs build → environment: github-pages → deploy-pages
```

### Workflow file

Path: `.github/workflows/deploy-pages.yml`

| Setting | Value |
|---------|--------|
| Triggers | `push` branches `[main]`, `workflow_dispatch` |
| Permissions | `contents: read`, `pages: write`, `id-token: write` |
| Concurrency | group for Pages; `cancel-in-progress: false` |

### App config

| Piece | Behavior |
|-------|----------|
| `vite.config.ts` | `base: process.env.VITE_BASE ?? '/'` — local `/`, CI `/goo-ja-bah-toolbox/` |
| CI env | `VITE_BASE=/goo-ja-bah-toolbox/` on the build job |
| `BrowserRouter` | `basename` from `import.meta.env.BASE_URL` with trailing slash stripped (Vite includes `/`; React Router basename must not) |
| SPA fallback | After build, `cp dist/index.html dist/404.html` |

Local `npm run build` / `npm run preview` keep default base `/` unless `VITE_BASE` is set.

## Components / files

| Path | Role |
|------|------|
| `.github/workflows/deploy-pages.yml` | test → build → deploy |
| `vite.config.ts` | configurable `base` |
| `src/app/App.tsx` | router `basename` |
| `docs/architecture.md` (or short deploy note) | document Pages URL, base, 404.html |
| `docs/README.md` | index row for deploy / this spec |

## Data flow

1. Commit lands on `main` (or manual dispatch)
2. Unit tests run; failure stops the pipeline
3. Production build with project `base`
4. Artifact uploaded; Pages deploy job publishes
5. Browser loads site under `/goo-ja-bah-toolbox/`; assets and client routes resolve relative to that base
6. Hard refresh on `/goo-ja-bah-toolbox/tools/<id>` → Pages serves `404.html` (SPA shell) → client router renders tool

## Error handling

- Test failure → workflow fails; no artifact / no deploy
- Build failure → deploy job skipped
- Deploy failure → GitHub Actions / Pages environment shows error; previous successful deploy remains until replaced
- Wrong `base` / missing `basename` → blank page or broken asset URLs (caught by manual verify after first deploy)

## Testing

- Deploy workflow runs **Vitest only** (`npm test`)
- No new unit tests required for config wiring beyond existing suite staying green
- Manual verify after first successful deploy (see below)
- E2e stays local / separate; not a deploy gate

## One-time ops (human)

After workflow exists on `main`: **Repo → Settings → Pages → Source = GitHub Actions**.

## Verification checklist

- [ ] Workflow green on `main`
- [ ] Site loads at `https://thanut-suw-work.github.io/goo-ja-bah-toolbox/`
- [ ] Home → tool navigation works
- [ ] Hard refresh on a tool URL still works

## Implementation notes (for plan)

- Prefer current official action major versions at implementation time
- Do not commit secrets; Pages deploy uses `GITHUB_TOKEN` + OIDC
- Update agent docs so future work knows about project `base` on CI
