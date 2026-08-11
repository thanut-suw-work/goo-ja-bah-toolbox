export type EngineRenderResult =
  | { ok: true; svg: string }
  | { ok: false; error: string; line: number | null }

const RENDER_TIMEOUT_MS = 30_000

/** Re-asserted before every render. Gantt must not use width:100% (lightbox shrinks it). */
function engineInit(theme: 'dark' | 'default') {
  return {
    startOnLoad: false,
    securityLevel: 'strict' as const,
    theme,
    gantt: { useMaxWidth: false },
  }
}

type MermaidApi = {
  initialize: (config: Record<string, unknown>) => void
  render: (id: string, text: string) => Promise<{ svg: string }>
}

function asErrorMessage(raw: unknown): string {
  if (typeof raw === 'string') return raw
  if (raw instanceof Error) return raw.message || String(raw)
  try {
    return String(raw ?? '')
  } catch {
    return 'Mermaid engine error'
  }
}

export function mapEngineError(
  message: unknown,
  startLine: number,
): { error: string; line: number | null } {
  const text = asErrorMessage(message)
  if (!text) return { error: 'Mermaid engine error', line: null }
  const m = text.match(/line\s+(\d+)/i)
  if (!m) return { error: text, line: null }
  const engineLine = Number.parseInt(m[1]!, 10)
  const fileLine = engineLine + startLine - 1
  const rewritten = text.replace(/line\s+\d+/i, `line ${fileLine}`)
  return { error: `Line ${fileLine}: ${rewritten}`, line: fileLine }
}

let enginePromise: Promise<MermaidApi> | null = null
let queue: Promise<unknown> = Promise.resolve()
let renderSeq = 0

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job)
  queue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

async function loadEngineOnce(): Promise<MermaidApi> {
  const mod = await import('mermaid')
  const mermaid = (mod.default ?? mod) as MermaidApi
  mermaid.initialize(engineInit('default'))
  return mermaid
}

export function loadEngine(): Promise<MermaidApi> {
  if (!enginePromise) {
    enginePromise = loadEngineOnce().catch((err: unknown) => {
      enginePromise = null
      throw err
    })
  }
  return enginePromise
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Mermaid render timed out'))
    }, ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      },
    )
  })
}

export function renderBlock(
  text: string,
  startLine: number,
  theme: 'dark' | 'default',
): Promise<EngineRenderResult> {
  return enqueue(async () => {
    try {
      const mermaid = await loadEngine()
      mermaid.initialize(engineInit(theme))
      const id = `mmd-${++renderSeq}`
      const { svg } = await withTimeout(
        mermaid.render(id, text),
        RENDER_TIMEOUT_MS,
      )
      return { ok: true as const, svg }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      const mapped = mapEngineError(message, startLine)
      return { ok: false as const, error: mapped.error, line: mapped.line }
    }
  })
}
