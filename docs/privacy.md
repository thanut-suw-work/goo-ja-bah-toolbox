# Privacy

GJB Toolbox is local-only by design.

## Guarantees

- No accounts or identity
- No analytics, ads, or tracking pixels
- No cookies used for tracking
- No `localStorage`, `sessionStorage`, or IndexedDB for app/tool state
- Tool inputs/outputs live in React memory only; refresh clears them
- Files (e.g. PDF) stay in the browser via the File API; never uploaded to a server we control

## Allowed network

- Loading the static app assets (HTML/JS/CSS/workers/fonts) from the static host
- No tool-processing requests to third-party APIs

## Agent rules

- Do not add telemetry, error-reporting SaaS, or “anonymous usage” calls
- Do not “helpfully” persist last tool, theme, or history without an explicit product decision that revises this doc and the design spec
- PDF and other file tools must revoke object URLs and drop file references on unmount
