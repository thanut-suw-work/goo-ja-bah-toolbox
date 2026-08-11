export type EngineRenderResult =
  | { ok: true; svg: string }
  | { ok: false; error: string; line: number | null }

type RenderToString = (
  lines: string[],
  onSuccess: (svg: string) => void,
  onError: (message: string) => void,
  options?: { dark?: boolean },
) => void

type Engine = {
  renderToString: RenderToString
}

const RENDER_TIMEOUT_MS = 30_000

function asErrorMessage(raw: unknown): string {
  if (typeof raw === 'string') return raw
  if (raw instanceof Error) return raw.message || String(raw)
  try {
    return String(raw ?? '')
  } catch {
    return 'Unknown PlantUML engine error'
  }
}

function isTeavmCrash(text: string): boolean {
  return (
    /can't access property/i.test(text) ||
    /cannot read propert/i.test(text) ||
    /\bbGH\b/.test(text)
  )
}

export function mapEngineError(
  message: unknown,
  startLine: number,
): { error: string; line: number | null } {
  const text = asErrorMessage(message)
  if (isTeavmCrash(text)) {
    return {
      error: `PlantUML engine crashed on this diagram. Try splitting it, or drop skinparam ParticipantPadding / BoxPadding. (${text})`,
      line: null,
    }
  }
  const m = text.match(/line\s+(\d+)/i)
  if (!m) return { error: text || 'PlantUML engine error', line: null }
  const engineLine = Number.parseInt(m[1]!, 10)
  const fileLine = engineLine + startLine - 1
  const rewritten = text.replace(/line\s+\d+/i, `line ${fileLine}`)
  return { error: `Line ${fileLine}: ${rewritten}`, line: fileLine }
}

let vizReady = false
let enginePromise: Promise<Engine> | null = null
let queue: Promise<unknown> = Promise.resolve()

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job)
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function vizGlobalPresent(): boolean {
  return typeof (globalThis as { Viz?: unknown }).Viz !== 'undefined'
}

function waitForScript(el: HTMLScriptElement): Promise<void> {
  return new Promise((resolve, reject) => {
    if (vizReady || vizGlobalPresent()) {
      vizReady = true
      resolve()
      return
    }
    el.addEventListener(
      'load',
      () => {
        vizReady = true
        resolve()
      },
      { once: true },
    )
    el.addEventListener(
      'error',
      () => {
        el.remove()
        reject(new Error('Failed to load Graphviz (viz-global.js)'))
      },
      { once: true },
    )
  })
}

function injectClassicScript(src: string): Promise<void> {
  if (vizReady || vizGlobalPresent()) {
    vizReady = true
    return Promise.resolve()
  }
  const existing = document.querySelector(
    'script[data-plantuml-viz="1"]',
  ) as HTMLScriptElement | null
  if (existing) return waitForScript(existing)
  const el = document.createElement('script')
  el.src = src
  el.async = false
  el.setAttribute('data-plantuml-viz', '1')
  const pending = waitForScript(el)
  document.head.appendChild(el)
  return pending
}

async function loadEngineOnce(): Promise<Engine> {
  // Copy both files as static assets (`?url`). Never a CDN.
  // Bundling plantuml.js lets Vite minify TeaVM; that NPEs on Pages
  // (`bGH` / empty "PlantUML engine error").
  const vizUrl = (await import('@plantuml/core/viz-global.js?url')).default
  await injectClassicScript(vizUrl)
  const plantumlUrl = (await import('@plantuml/core/plantuml.js?url')).default
  const core = (await import(/* @vite-ignore */ plantumlUrl)) as {
    renderToString: RenderToString
  }
  return { renderToString: core.renderToString }
}

export function loadEngine(): Promise<Engine> {
  if (!enginePromise) {
    enginePromise = loadEngineOnce().catch((err: unknown) => {
      enginePromise = null
      throw err
    })
  }
  return enginePromise
}

function copyLines(lines: string[]): string[] {
  return Array.from(lines, (line) => (line == null ? '' : String(line)))
}

/**
 * TeaVM may throw a JS TypeError on its worker timer instead of onError.
 * Capture that, and always pass a plain line array + options object.
 */
function renderToStringP(
  renderToString: RenderToString,
  lines: string[],
  dark: boolean,
): Promise<string> {
  const safeLines = copyLines(lines)
  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      window.removeEventListener('error', onWindowError)
      window.removeEventListener('unhandledrejection', onUnhandled)
      clearTimeout(timer)
      fn()
    }
    const onWindowError = (ev: ErrorEvent) => {
      const msg = asErrorMessage(ev.error ?? ev.message)
      if (!isTeavmCrash(msg)) return
      ev.preventDefault()
      finish(() => reject(new Error(msg)))
    }
    const onUnhandled = (ev: PromiseRejectionEvent) => {
      const msg = asErrorMessage(ev.reason)
      if (!isTeavmCrash(msg)) return
      ev.preventDefault()
      finish(() => reject(new Error(msg)))
    }
    window.addEventListener('error', onWindowError)
    window.addEventListener('unhandledrejection', onUnhandled)
    const timer = setTimeout(() => {
      finish(() => reject(new Error('PlantUML render timed out')))
    }, RENDER_TIMEOUT_MS)
    try {
      renderToString(
        safeLines,
        (svg) => finish(() => resolve(svg)),
        (message) => finish(() => reject(new Error(asErrorMessage(message)))),
        { dark },
      )
    } catch (e) {
      finish(() =>
        reject(e instanceof Error ? e : new Error(asErrorMessage(e))),
      )
    }
  })
}

/**
 * Sequential on purpose: TeaVM renderToString overwrites a previous
 * in-flight request. Never parallelize.
 */
export function renderBlock(
  lines: string[],
  startLine: number,
  dark: boolean,
): Promise<EngineRenderResult> {
  return enqueue(async () => {
    try {
      const engine = await loadEngine()
      const svg = await renderToStringP(engine.renderToString, lines, dark)
      return { ok: true as const, svg }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      const mapped = mapEngineError(message, startLine)
      return { ok: false as const, error: mapped.error, line: mapped.line }
    }
  })
}
