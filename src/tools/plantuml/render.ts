export type EngineRenderResult =
  | { ok: true; svg: string }
  | { ok: false; error: string; line: number | null }

type RenderToString = (
  lines: string[],
  onSuccess: (svg: string) => void,
  onError: (message: string) => void,
) => void

type Engine = {
  renderToString: RenderToString
}

export function mapEngineError(
  message: string,
  startLine: number,
): { error: string; line: number | null } {
  const m = message.match(/line\s+(\d+)/i)
  if (!m) return { error: message, line: null }
  const engineLine = Number.parseInt(m[1]!, 10)
  const fileLine = engineLine + startLine - 1
  const rewritten = message.replace(/line\s+\d+/i, `line ${fileLine}`)
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

function injectClassicScript(src: string): Promise<void> {
  if (vizReady) return Promise.resolve()
  const existing = document.querySelector('script[data-plantuml-viz="1"]')
  if (existing) {
    vizReady = true
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const el = document.createElement('script')
    el.src = src
    el.async = false
    el.setAttribute('data-plantuml-viz', '1')
    el.onload = () => {
      vizReady = true
      resolve()
    }
    el.onerror = () => {
      el.remove()
      reject(new Error('Failed to load Graphviz (viz-global.js)'))
    }
    document.head.appendChild(el)
  })
}

async function loadEngineOnce(): Promise<Engine> {
  // Bundled URL from our static host (Pages base path included). Never a CDN.
  const vizMod = await import('@plantuml/core/viz-global.js?url')
  const vizUrl = vizMod.default
  await injectClassicScript(vizUrl)
  const core = await import('@plantuml/core/plantuml.js')
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

function renderToStringP(
  renderToString: RenderToString,
  lines: string[],
): Promise<string> {
  return new Promise((resolve, reject) => {
    renderToString(
      lines,
      (svg) => resolve(svg),
      (message) => reject(new Error(message)),
    )
  })
}

/**
 * Sequential on purpose: TeaVM renderToString overwrites a previous
 * in-flight request. Never parallelize.
 */
export function renderBlock(
  lines: string[],
  startLine: number,
): Promise<EngineRenderResult> {
  return enqueue(async () => {
    const engine = await loadEngine()
    try {
      const svg = await renderToStringP(engine.renderToString, lines)
      return { ok: true as const, svg }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      const mapped = mapEngineError(message, startLine)
      return { ok: false as const, error: mapped.error, line: mapped.line }
    }
  })
}
