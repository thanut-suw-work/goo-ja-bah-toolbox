# Tool UI Prototype Light Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle all tool pages to light `ui-prototype` chrome (Tailwind + minimal shadcn), add a 3-step PDF wizard UI, and add the home origin note — warm pale-yellow light theme for eye comfort; no dark mode or theme persistence.

**Architecture:** Keep AppShell + registry + lazy PDF. Add Tailwind light tokens (warm yellow paper tint + brass primary). Shared `ToolLayout` + shadcn primitives. Text tools get dual-pane cards; PDF gets local step state over existing convert/range logic.

**Tech Stack:** React 19 · Vite · TypeScript · Tailwind 3 · CVA/clsx/tailwind-merge · lucide-react · sonner · Radix Slot (button) · existing pdfjs/jszip

**Spec:** `docs/superpowers/specs/2026-08-05-tool-ui-prototype-light-design.md`

---

## File map

**Create:**
```
tailwind.config.js
postcss.config.js
src/lib/utils.ts
src/components/ui/button.tsx
src/components/ui/card.tsx
src/components/ui/textarea.tsx
src/components/ui/input.tsx
src/components/ui/label.tsx
src/components/ui/select.tsx
src/components/ui/sonner.tsx
src/tools/shared/ToolPageHeader.tsx
src/tools/shared/IoPanels.tsx
```

**Modify:**
```
package.json
src/main.tsx
src/styles/global.css          # Tailwind layers + light tokens; keep home list styles
src/app/AppShell.tsx           # Toaster
src/app/HomePage.tsx           # Origin note
src/tools/shared/ToolLayout.tsx
src/tools/json-formatter/JsonFormatterTool.tsx
src/tools/base64/Base64Tool.tsx
src/tools/hash-sha256/HashSha256Tool.tsx
src/tools/text-case/TextCaseTool.tsx
src/tools/uuid/UuidTool.tsx
src/tools/unix-timestamp/UnixTimestampTool.tsx
src/tools/pdf-to-image/PdfToImageTool.tsx
testing/e2e/home.spec.ts
DESIGN.md
docs/features/home.md
docs/features/pdf-to-image.md
```

**Do not modify:** tool `logic.ts` / `convert.ts` / `range.ts` (behavior unchanged).

**Reference (copy then trim):** `ui-prototype/src/components/ui/{button,card,textarea,input,label,select,sonner}.tsx`, `ui-prototype/src/lib/utils.ts`, `ui-prototype/tailwind.config.js` — light `:root` only, no `.dark`, no ModeToggle.

---

### Task 1: Tailwind + deps + light tokens

**Files:**
- Create: `tailwind.config.js`, `postcss.config.js`, `src/lib/utils.ts`
- Modify: `package.json`, `src/main.tsx`, `src/styles/global.css`

- [ ] **Step 1: Install deps**

```bash
npm install class-variance-authority clsx tailwind-merge lucide-react sonner @radix-ui/react-slot @radix-ui/react-label @radix-ui/react-select
npm install -D tailwindcss@3 postcss autoprefixer
```

Expected: packages added; lockfile updated.

- [ ] **Step 2: Add PostCSS + Tailwind config**

Create `postcss.config.js`:

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

Create `tailwind.config.js` (content + shadcn color map; `darkMode: ['class']` unused — never add `.dark`):

```js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 3: Create `src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 4: Prepend Tailwind + HSL tokens to `src/styles/global.css`**

At the **top** of `global.css` (keep existing `@fontsource` imports and home/tool-list rules below):

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Warm pale-yellow light — eye comfort; brass primary */
    --background: 42 35% 96%; /* ~#f7f5ed */
    --foreground: 30 12% 12%;
    --card: 42 40% 99%;
    --card-foreground: 30 12% 12%;
    --popover: 42 40% 99%;
    --popover-foreground: 30 12% 12%;
    --primary: 36 66% 55%; /* brass fill */
    --primary-foreground: 40 55% 9%; /* accent-ink */
    --secondary: 42 25% 93%;
    --secondary-foreground: 30 12% 12%;
    --muted: 42 25% 93%;
    --muted-foreground: 30 8% 38%;
    --accent: 42 25% 93%;
    --accent-foreground: 30 12% 12%;
    --destructive: 8 65% 42%;
    --destructive-foreground: 0 0% 100%;
    --border: 40 18% 84%;
    --input: 40 18% 84%;
    --ring: 28 75% 36%;
    --radius: 0.5rem;
  }

  * {
    @apply border-border;
  }
}
```

Also retarget legacy `--bg` / `--surface` in the same file to the warm paper values so home list matches tools (e.g. `--bg: #f7f5ed; --surface: #fffcf5;`).

- [ ] **Step 5: Ensure CSS loads**

`src/main.tsx` must import `./styles/global.css` (already does). No theme provider.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tailwind.config.js postcss.config.js src/lib/utils.ts src/styles/global.css
git commit -m "$(cat <<'EOF'
chore: add Tailwind light tokens for tool UI

EOF
)"
```

---

### Task 2: shadcn UI primitives + Toaster

**Files:**
- Create: `src/components/ui/button.tsx`, `card.tsx`, `textarea.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `sonner.tsx`
- Modify: `src/app/AppShell.tsx`

- [ ] **Step 1: Copy primitives from prototype**

Copy these files from `ui-prototype/src/components/ui/` into `src/components/ui/`, fixing imports to `@/lib/utils` and `@/components/ui/...`:

- `button.tsx` (needs `@radix-ui/react-slot`)
- `card.tsx`
- `textarea.tsx`
- `input.tsx`
- `label.tsx` (needs `@radix-ui/react-label`)
- `select.tsx` (needs `@radix-ui/react-select`)
- `sonner.tsx`

Strip any `dark:` class variants if present. Do not copy `theme-provider` or `mode-toggle`.

- [ ] **Step 2: Mount Toaster in AppShell**

Modify `src/app/AppShell.tsx`:

```tsx
import { Link, Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__header-inner">
          <Link to="/" className="brand">
            <span className="brand__word">GJB Toolbox</span>
          </Link>
        </div>
      </header>
      <main className="app-shell__main">
        <Outlet />
      </main>
      <Toaster position="bottom-right" />
    </div>
  )
}
```

- [ ] **Step 3: Typecheck**

```bash
npx tsc -b --pretty false
```

Expected: exit 0 (or only pre-existing unrelated errors — fix any from new files).

- [ ] **Step 4: Commit**

```bash
git add src/components/ui src/app/AppShell.tsx
git commit -m "$(cat <<'EOF'
feat: add light shadcn primitives and toaster

EOF
)"
```

---

### Task 3: Shared tool chrome helpers

**Files:**
- Create: `src/tools/shared/ToolPageHeader.tsx`, `src/tools/shared/IoPanels.tsx`
- Modify: `src/tools/shared/ToolLayout.tsx`

- [ ] **Step 1: Update ToolLayout**

```tsx
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

type Props = {
  title: string
  description: string
  icon?: LucideIcon
  children: ReactNode
}

export function ToolLayout({ title, description, icon: Icon, children }: Props) {
  return (
    <section className="space-y-6">
      <Link
        to="/"
        className="tool-page__back inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M10 3.5L5 8l5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        GJB Toolbox
      </Link>
      <header className="space-y-2">
        <h1 className="flex items-center gap-3 font-display text-3xl font-bold tracking-tight text-foreground">
          {Icon ? <Icon className="h-8 w-8 text-primary" aria-hidden="true" /> : null}
          {title}
        </h1>
        <p className="text-muted-foreground">{description}</p>
      </header>
      {children}
    </section>
  )
}
```

Ensure `font-display` works (Tailwind `fontFamily.display`) or use `style={{ fontFamily: 'var(--font-display)' }}` / class from global.css.

- [ ] **Step 2: Create IoPanels helper**

`src/tools/shared/IoPanels.tsx`:

```tsx
import type { ReactNode } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type PanelProps = {
  title: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function IoPanel({ title, actions, children, className }: PanelProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </CardTitle>
        {actions ? <div className="flex gap-2">{actions}</div> : null}
      </CardHeader>
      <CardContent className="border-t p-0">{children}</CardContent>
    </Card>
  )
}

export function IoGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">{children}</div>
  )
}

export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4">
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/tools/shared/ToolLayout.tsx src/tools/shared/IoPanels.tsx
git commit -m "$(cat <<'EOF'
feat: shared tool layout chrome for dual-pane tools

EOF
)"
```

---

### Task 4: Home origin note + e2e

**Files:**
- Modify: `src/app/HomePage.tsx`, `src/styles/global.css`, `testing/e2e/home.spec.ts`, `docs/features/home.md`

- [ ] **Step 1: Write failing e2e assertion**

In `testing/e2e/home.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('home shows brand and tools', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'GJB Toolbox' })).toBeVisible()
  await expect(page.getByRole('link', { name: /JSON formatter/i })).toBeVisible()
  await expect(
    page.getByText(
      /I built this after getting stuck on apps that only accept tax invoices as images/,
    ),
  ).toBeVisible()
})
```

- [ ] **Step 2: Run e2e — expect fail**

```bash
npx playwright test testing/e2e/home.spec.ts
```

Expected: FAIL — origin text missing.

- [ ] **Step 3: Add origin note to HomePage**

After the trust-pills `<ul>` in `src/app/HomePage.tsx`:

```tsx
<p className="home-hero__origin">
  I built this after getting stuck on apps that only accept tax invoices as
  images — I had a PDF.
</p>
```

Add CSS:

```css
.home-hero__origin {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
  max-width: 62ch;
  margin: var(--space-4) 0 0;
}
```

Update `docs/features/home.md` UI notes: origin sentence under trust pills.

- [ ] **Step 4: Re-run e2e — expect pass**

```bash
npx playwright test testing/e2e/home.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/HomePage.tsx src/styles/global.css testing/e2e/home.spec.ts docs/features/home.md
git commit -m "$(cat <<'EOF'
feat: add home origin note under trust pills

EOF
)"
```

---

### Task 5: Restyle JSON + Base64 + Hash + Text case

**Files:**
- Modify: `JsonFormatterTool.tsx`, `Base64Tool.tsx`, `HashSha256Tool.tsx`, `TextCaseTool.tsx`
- Possibly modify: `src/app/ToolPage.tsx` if it wraps ToolLayout (keep registry titles/descriptions)

- [ ] **Step 1: Restyle JSON formatter**

Keep `formatJson` / mode select behavior. Preserve:
- `aria-label="JSON input"` / `JSON output`
- Button accessible name **Format** (e2e)

Pattern:

```tsx
import { Braces, Copy, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { IoGrid, IoPanel, ActionBar } from '@/tools/shared/IoPanels'
// ToolLayout is applied by ToolPage — only restyle inner content unless ToolPage passes icon

export function JsonFormatterTool() {
  // existing state + run() unchanged
  return (
    <div className="space-y-6">
      <IoGrid>
        <IoPanel
          title="Input"
          actions={
            <Button type="button" variant="ghost" size="sm" onClick={() => { setInput(''); setOutput(''); setError(null) }}>
              <Trash2 /> Clear
            </Button>
          }
        >
          <Textarea
            aria-label="JSON input"
            className="min-h-[300px] resize-none rounded-none border-0 font-mono focus-visible:ring-0"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </IoPanel>
        <IoPanel
          title="Output"
          actions={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!output}
              onClick={async () => {
                await navigator.clipboard.writeText(output)
                toast.success('Copied to clipboard')
              }}
            >
              <Copy /> Copy
            </Button>
          }
        >
          <Textarea
            aria-label="JSON output"
            readOnly
            className="min-h-[300px] resize-none rounded-none border-0 bg-muted/30 font-mono focus-visible:ring-0"
            value={output}
          />
        </IoPanel>
      </IoGrid>
      {error ? <p role="alert" className="text-destructive">{error}</p> : null}
      <ActionBar>
        {/* keep Mode select + Format button name */}
        <Button type="button" onClick={run} disabled={!input.trim()}>
          Format
        </Button>
      </ActionBar>
    </div>
  )
}
```

If `ToolPage` wraps with `ToolLayout`, pass `icon={Braces}` from ToolPage via registry optional field **or** leave icon off in Task 5 and add optional `icon` on registry in a small follow-up — prefer optional `icon` on `ToolDefinition` only if low churn; otherwise put icon inside each tool above panels (duplicate title — avoid). Check `ToolPage.tsx`: if it already renders title, add optional icon prop there from registry.

- [ ] **Step 2: Same pattern for Base64, Hash, Text case**

- Preserve each tool’s existing aria-labels and primary button names.
- Base64: Encode / Decode actions in `ActionBar`.
- Hash: Hash action + copy.
- Text case: Mode select + Transform.

- [ ] **Step 3: Run unit + JSON e2e**

```bash
npm test
npx playwright test testing/e2e/json-formatter.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/tools/json-formatter src/tools/base64 src/tools/hash-sha256 src/tools/text-case src/app/ToolPage.tsx src/tools/types.ts src/tools/registry.ts
git commit -m "$(cat <<'EOF'
feat: restyle text tools with dual-pane cards

EOF
)"
```

---

### Task 6: Restyle UUID + Unix timestamp

**Files:**
- Modify: `UuidTool.tsx`, `UnixTimestampTool.tsx`

- [ ] **Step 1: UUID — controls card + output card**

Use `IoGrid` with Count input + Generate in left/actions; read-only output textarea (`aria-label="UUID output"`) in right panel. Keep `generateUuids` logic.

- [ ] **Step 2: Unix timestamp — two cards**

One card per direction (sec→ISO, ISO→sec). `lg:grid-cols-2`. Keep aria-labels and `role="alert"` errors.

- [ ] **Step 3: Unit tests**

```bash
npm test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/tools/uuid src/tools/unix-timestamp
git commit -m "$(cat <<'EOF'
feat: restyle UUID and timestamp tools

EOF
)"
```

---

### Task 7: PDF 3-step wizard UI

**Files:**
- Modify: `src/tools/pdf-to-image/PdfToImageTool.tsx`, `docs/features/pdf-to-image.md`
- Do not change `convert.ts` / `range.ts`

- [ ] **Step 1: Implement step state**

```tsx
type Step = 1 | 2 | 3
const [step, setStep] = useState<Step>(1)
```

Keep existing file/pageCount/from/to/format/error/busy/pendingUrlsRef logic.

**Step 1 UI:** Card titled “Upload” — `<input type="file" accept="application/pdf">` (optional dashed drop zone styling). On success show filename + `Page count: N`. Button “Next” → `setStep(2)` disabled until `pageCount !== null`. Errors `role="alert"`.

**Step 2 UI:** Card — From / To number inputs, Format `<select>` (or shadcn Select), Back → step 1, Convert button calls existing `onConvert` then `setStep(3)` on success. Busy: disable + “Converting…”.

**Step 3 UI:** Card — success message (“Download started” / single file vs zip). Button to re-call download if you stored last blobs in state **or** instruct “use browser download”; simplest: keep convert triggering download in step 2, step 3 only confirms + “Convert another” resets file/state/`setStep(1)`.

Prefer: on successful convert in step 2, advance to 3; “Convert another” clears file + ranges + step 1.

Step indicator: three labeled pills/buttons (non-clickable or click only completed steps). Use plain buttons + Tailwind, not a heavy wizard lib.

- [ ] **Step 2: Update feature doc**

In `docs/features/pdf-to-image.md` add UI section describing the three steps.

- [ ] **Step 3: Unit tests still pass**

```bash
npm test
```

Expected: PASS (range tests unchanged).

- [ ] **Step 4: Commit**

```bash
git add src/tools/pdf-to-image/PdfToImageTool.tsx docs/features/pdf-to-image.md
git commit -m "$(cat <<'EOF'
feat: PDF tool 3-step wizard UI

EOF
)"
```

---

### Task 8: DESIGN.md + verify + full check

**Files:**
- Modify: `DESIGN.md`, `docs/README.md` (if not already), optionally slim unused old `.tool-panel` rules that conflict

- [ ] **Step 1: Update DESIGN.md**

Record:
- Tool pages use light shadcn-style cards / dual-pane / PDF wizard
- Home remains list + origin note
- Light only; no theme toggle
- Brass primary mapped into Tailwind `--primary`
- Lucide icons allowed for tool titles (authored SVG chevron still for back/home rows)

- [ ] **Step 2: Full verification**

```bash
npm test
npm run test:e2e
npm run build
```

Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add DESIGN.md docs/
git commit -m "$(cat <<'EOF'
docs: record light prototype tool UI in DESIGN.md

EOF
)"
```

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| Tailwind + minimal shadcn lift | 1–2 |
| Light only / no theme storage | 1, 2 |
| Home origin note | 4 |
| Dual-pane text tools | 5 |
| UUID / timestamp layouts | 6 |
| PDF 3-step wizard | 7 |
| Preserve e2e labels | 5 |
| DESIGN.md / feature docs | 4, 7, 8 |
| Logic untouched | 5–7 (explicit) |

## Placeholder / consistency self-review

- No TBD steps
- Button name **Format** preserved for JSON e2e
- Brass HSL primary + warm yellow `--background` 42 35% 96% used consistently in Task 1 tokens
- PDF steps 1\|2\|3 match spec wizard
- Cool steel `#f2f3f6` replaced by warm paper (not cream+terracotta brochure look)
