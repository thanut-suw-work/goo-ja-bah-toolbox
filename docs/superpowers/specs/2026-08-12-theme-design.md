# Theme (default dark + localStorage) — Design Spec

Date: 2026-08-12  
Status: approved (brainstorm)  
Surface: app shell (every route) + mermaid/plantuml engine theme

## Summary

GJB Toolbox **defaults to dark**. Visitor can cycle **Dark → Light → System** via one header icon. Preference is the **only** persisted value: `localStorage` key `gjb-theme` (`dark` | `light` | `system`). Tool input/output still dies on refresh. Dark look is **cool slate** (GitHub/editor night), not warm walnut. Light is today’s paper tokens. Mermaid and PlantUML follow the **resolved** theme and **re-render in place** when it flips.

This is the explicit product decision that revises `docs/privacy.md`, `PRODUCT.md`, and `DESIGN.md` (which previously forbade theme persistence and a dark default).

## Goals

- First visit / missing key = dark, even if OS is light
- Remember Dark / Light / System across refresh and visits
- No FOUC (no paper flash before JS)
- One compact header control on every route
- Diagram engines match chrome; existing diagram output restyles without another Visualize click
- Privacy story stays honest: theme key only

## Non-goals

- URL-based theme (`/light`, `?theme=`)
- Dumping CSS tokens into storage (enum only)
- Custom palettes / theme editor
- Persisting accordion open state, last tool, recents, or any tool input/output
- Theming PDF / SVG→image **rasters** (user bytes, not chrome)
- `next-themes` or other theme libraries
- Tailwind `dark:` utility sweep (tokens switch; components already use CSS variables)
- Warm “night workshop” dark (explicitly rejected in brainstorm)

## Constraints

- Client-only; no backend, no cookies for tracking
- Stack: React + Vite + TypeScript; no new runtime deps
- UI: Impeccable **Operate**; brass accent stays; still no purple/indigo, neon, card-grid home
- `docs/privacy.md` must name the exception; agents must not treat it as a license for other keys
- Local browser-reachable servers: never start in Cursor sandbox netns

## Approach (chosen)

**`html[data-theme]` + blocking `index.html` script + CSS token blocks + tiny React context.**

- `:root` = cool slate (default dark)
- `html[data-theme="light"]` = current paper + shadcn HSL twins
- `data-theme` is always the **resolved** value (`dark` | `light`), never `system`
- Stored **preference** lives in `localStorage` and React state; `system` resolves via `prefers-color-scheme`
- Header button cycles preference; writes storage; sets attribute
- Mermaid `initialize` theme + PlantUML `{ dark }` read resolved theme; tools re-run last visualize when resolved changes

Rejected:

- URL prefix `/light` — user chose storage after comparing
- `.dark` class / shadcn `darkMode: 'class'` — current chrome is hex custom properties, not `dark:` utilities; same work, worse fit
- `next-themes` — extra dep; old specs already refused it
- Theme-only in memory — refresh would reset; user wanted persist
- Header-only invert — looks broken
- Chrome dark / diagrams light — user chose full invert

## Architecture

```
index.html (blocking script)
  → read gjb-theme → resolve → html[data-theme] + color-scheme
src/styles/global.css
  → :root slate tokens; html[data-theme="light"] paper tokens
ThemeProvider (React)
  → preference + resolved; cycle(); matchMedia when preference=system
AppShell ThemeToggle
  → icon button; aria-label Theme: Dark|Light|System
MermaidTool / PlantumlTool
  → renderBlock(..., resolved); useEffect re-visualize on resolved change
```

Router, registry, lazy chunks, and `/tools/:id` paths unchanged.

## Data model

```ts
export const THEME_STORAGE_KEY = 'gjb-theme'

export type ThemePreference = 'dark' | 'light' | 'system'
export type ResolvedTheme = 'dark' | 'light'

export function parseThemePreference(raw: string | null): ThemePreference
// null, '', garbage → 'dark'. Does not write storage.

export function resolveTheme(
  preference: ThemePreference,
  prefersLight: boolean,
): ResolvedTheme
// system + prefersLight → light; system + !prefersLight → dark;
// otherwise preference as ResolvedTheme

export function cycleTheme(current: ThemePreference): ThemePreference
// dark → light → system → dark
```

### Storage rules

| Event | Storage | `data-theme` |
|-------|---------|--------------|
| First visit (no key) | untouched | `dark` |
| Garbage value | treat as `dark`; do not repair-write until user clicks | `dark` |
| Click cycle | write new preference | resolved of that preference |
| `system` + OS change | key stays `system` | follow `matchMedia` |
| `localStorage` throws (private mode / quota) | skip write; keep memory state | still update attribute |

No other keys. No `sessionStorage`. No IndexedDB.

## Components

| Unit | Responsibility | Depends on |
|------|----------------|------------|
| `index.html` inline script | First paint: same parse/resolve rules as `theme.ts` (duplicated; comment points at that file — no TS import in `<head>`). Set `data-theme`, `color-scheme`, and `html` background to **resolved** (`#0d1117` dark / `#f7f5ed` light) so CSS-from-JS cannot flash the other theme | `localStorage`, `matchMedia` |
| `src/app/theme.ts` | Pure parse / resolve / cycle; storage key constant | — |
| `ThemeProvider` | Holds preference; syncs attribute; `matchMedia` listener iff preference is `system`; `cycle()` | `theme.ts` |
| `ThemeToggle` | 36×36 icon button; moon / sun / monitor; visually-hidden `aria-live="polite"` | context |
| `AppShell` | Renders toggle at trailing edge of header (after Back on tool pages) | `ThemeToggle` |
| `global.css` | Two token blocks (hex workshop + shadcn HSL) | `data-theme` |
| `mermaid/render.ts` | `renderBlock(text, startLine, theme: 'dark' \| 'default')`; re-assert that theme + `securityLevel: 'strict'` each call | mermaid |
| `plantuml/render.ts` | `renderBlock(lines, startLine, { dark: boolean })` → `renderToString(..., { dark })` | `@plantuml/core` |
| MermaidTool / PlantumlTool | Pass resolved; if `results.length > 0` and resolved changes, re-run visualize from current source (same busy/queue rules) | context + render |

## Data flow

1. HTML parser runs inline script in `<head>` → `data-theme` + matching `html` background set before `#root` / module CSS. Returning light users must not flash slate; first visits must not flash paper.
2. React mounts `ThemeProvider` (inside `BrowserRouter` is fine; theme is not route-based). Initial preference = `parseThemePreference(localStorage.getItem(...))` inside try/catch
3. Provider writes `data-theme` again (idempotent) so React and script agree
4. Click toggle → `cycleTheme` → setState → `localStorage.setItem` → set attribute
5. If preference is `system`, subscribe to `(prefers-color-scheme: light)` `change`; unsubscribe when leaving `system`
6. Diagram tools: `useTheme().resolved`. Visualize uses it. `useEffect` on `resolved` re-renders existing results from current source; no-op if source empty, no results, or a run already in flight. **Do not** clear results to `[]` first (that path is for a new Visualize click). Keep old SVGs until the new run finishes, then replace. Lightbox index stays. PNG regeneration follows the existing per-card raster path after SVG swap
7. Refresh: script reads key; light visitors stay light; first-time visitors stay dark

## Tokens (dark `:root`)

Cool slate. Brass fill unchanged (buttons). `--brass-strong` **lightens** so it can be text/icon/focus on dark surfaces.

```css
:root {
  --bg: #0d1117;
  --surface: #161b22;
  --line: rgba(230, 237, 243, 0.12);
  --line-strong: rgba(230, 237, 243, 0.22);
  --text-primary: #e6edf3;
  --text-secondary: #b1bac4;
  --text-tertiary: #8b949e;
  --brass: #d99a3f;
  --brass-hover: #e7ab55;
  --brass-strong: #e7ab55;
  --brass-ink: #241a08;
  --danger: #f85149;
  --success: #3fb950;
  --focus-ring: var(--brass-strong);
  color-scheme: dark;
}
```

Shadcn HSL twins on `:root` must match those surfaces (same pairing as today’s light file: `--background` ≈ `--bg`, `--card` ≈ `--surface`, `--primary` = brass). Body gradient: cool wash only (no warm paper glow).

`html[data-theme="light"]` contains **today’s** paper hex + HSL blocks and `color-scheme: light`. Do not restyle light; move the current `:root` block under that selector.

**Contrast invariant:** `--text-primary`, `--text-secondary`, `--text-tertiary`, `--brass-strong`, `--danger` must each clear 4.5:1 on `--bg` and `--surface`. If a named hex fails, nudge lightness in CSS — do not invent a third theme.

Header `box-shadow` on dark: use a dark-tinted shadow (not `rgba(15, 23, 42, 0.1)` on slate — invisible). Light selector keeps the current shadow.

## UI

- Control: one icon button, 36×36, trailing in `.app-shell__header-inner`. Border uses `--line`; icon `--brass` / `--brass-strong`. Inline SVG (same family as brand mark), not a new icon pack in the shell
- Icons: crescent = dark, sun = light, monitor = system
- `aria-label` and `title`: `Theme: Dark` / `Theme: Light` / `Theme: System`
- Visually hidden `aria-live="polite"` repeats that phrase on change
- Click cycle only (no menu, no segmented control)
- Icon swap **instant**; no extra transition (motion budget stays the existing three; do not add a fourth)
- Focus-visible: 2px `--focus-ring` outline, same as other chrome
- Home trust pills unchanged (`No accounts`, `No uploads`, `No tracking`). Add one line under the pills, before origin note: **Theme choice stays in this browser. Everything you paste still dies on refresh.**

## Errors / invariants

- Unknown storage value ≡ dark; never crash
- Storage exceptions ≡ memory-only theme; never crash
- `data-theme` is only `dark` or `light`
- Mermaid still re-asserts `securityLevel: 'strict'` every render; theme argument is not a secure-key escape. `%%{init}%%` / YAML `---` non-secure keys still apply (existing behavior)
- PlantUML still sequential; 4th arg is always `{ dark: resolved === 'dark' }` (`true` or `false`, never omitted)
- Theme change does not persist diagram source (still React memory)
- No `localStorage` reads/writes outside `theme.ts` / the inline script / `ThemeProvider`

## Testing

- **Unit `theme.ts`:** parse null/garbage/`DARK`/valid three; resolve matrix; cycle wraps
- **Unit `ThemeProvider` / toggle:** label `Theme: Dark` by default; three clicks return to Dark; `system` + mocked `matchMedia` follows light OS
- **Unit mermaid `renderBlock`:** `initialize` called with `theme: 'dark'` / `'default'` matching argument (engine mocked)
- **Unit plantuml `renderBlock`:** `renderToString` 4th arg `{ dark: true }` iff requested (engine mocked)
- **Unit MermaidTool / PlantumlTool:** with results on screen, flipping resolved calls `renderBlock` again without a Visualize click (engines mocked)
- **e2e:** first load `html[data-theme=dark]`; click once → `data-theme=light` and `localStorage gjb-theme=light`; reload still light. Do not assert OS `system` in e2e (environment-dependent)

## Docs (implementation must update)

| File | Change |
|------|--------|
| `docs/privacy.md` | Exception: key `gjb-theme`, enum only. Agent rule: do not persist anything else |
| `PRODUCT.md` | Persistence constraint: theme preference only; tool state still ephemeral |
| `DESIGN.md` | Dark default + cool slate tokens; toggle exists; drop “no toggle / no cool dark / no persist” out-of-scope paragraph; contrast notes for dark surfaces |
| `docs/architecture.md` | FOUC script, `data-theme`, ThemeProvider |
| `docs/features/home.md` | Theme line + header control |
| `docs/features/mermaid.md` | Engine theme follows resolved; re-render on change |
| `docs/features/plantuml.md` | `{ dark }` follows resolved; re-render on change |
| `docs/README.md` | This spec |
| `docs/superpowers/specs/2026-08-05-gjb-toolbox-design.md` | Note superseded privacy/theme bullets (pointer here) |

## Privacy exception (normative text for `privacy.md`)

Keep “no storage for app/tool state.” Add:

> Exception: `localStorage['gjb-theme']` may be `dark`, `light`, or `system`. Nothing else. No tool input, output, recents, accordion state, or other preferences.

Revise the agent rule that currently says “do not persist … theme” so theme is allowed **only** via that key.
