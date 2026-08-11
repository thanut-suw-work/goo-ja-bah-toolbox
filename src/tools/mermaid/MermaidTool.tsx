import { useEffect, useRef, useState } from 'react'
import { Download, Maximize2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ActionBar, IoPanel } from '@/tools/shared/IoPanels'
import { DiagramLightbox } from '@/tools/shared/DiagramLightbox'
import { svgToRaster } from '@/tools/shared/svgToRaster'
import { parseMermaid } from './parse'
import { renderBlock } from './render'

export type DiagramResult =
  | { ok: true; svg: string; pngError: string | null }
  | { ok: false; error: string }

function stemOf(fileName: string): string {
  const base = fileName.replace(/^.*[/\\]/, '')
  const dot = base.lastIndexOf('.')
  if (dot <= 0) return base.length > 0 ? base : 'diagram'
  const stem = base.slice(0, dot)
  return stem.length > 0 ? stem : 'diagram'
}

function triggerBlobDownload(blob: Blob, filename: string): string {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  return url
}

export function MermaidTool() {
  const [source, setSource] = useState('')
  const [filename, setFilename] = useState<string | null>(null)
  const [stem, setStem] = useState('diagram')
  const [readError, setReadError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<DiagramResult[]>([])
  const [pngBusy, setPngBusy] = useState<Set<number>>(() => new Set())
  const [fatal, setFatal] = useState<Error | null>(null)
  const [viewing, setViewing] = useState<number | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingUrlsRef = useRef<Set<string>>(new Set())
  const aliveRef = useRef(true)
  const busyRef = useRef(false)

  useEffect(() => {
    aliveRef.current = true
    const pendingUrls = pendingUrlsRef.current
    return () => {
      aliveRef.current = false
      for (const url of pendingUrls) URL.revokeObjectURL(url)
      pendingUrls.clear()
    }
  }, [])

  if (fatal) throw fatal

  function registerUrl(url: string) {
    pendingUrlsRef.current.add(url)
    setTimeout(() => {
      if (pendingUrlsRef.current.delete(url)) URL.revokeObjectURL(url)
    }, 1000)
  }

  function revokeAll() {
    for (const url of pendingUrlsRef.current) URL.revokeObjectURL(url)
    pendingUrlsRef.current.clear()
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setReadError(null)
    try {
      const text = await file.text()
      setSource(text)
      setFilename(file.name)
      setStem(stemOf(file.name))
      setResults([])
      setViewing(null)
      revokeAll()
    } catch {
      setReadError('Could not read file')
    }
  }

  function onClear() {
    setSource('')
    setFilename(null)
    setStem('diagram')
    setReadError(null)
    setResults([])
    setPngBusy(new Set())
    setViewing(null)
    revokeAll()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function onVisualize() {
    if (!source.trim() || busyRef.current) return
    busyRef.current = true
    revokeAll()
    setResults([])
    setPngBusy(new Set())
    setViewing(null)
    setBusy(true)
    try {
      const blocks = parseMermaid(source)
      const acc: DiagramResult[] = []
      for (const block of blocks) {
        const r = await renderBlock(block.text, block.startLine)
        acc.push(
          r.ok
            ? { ok: true, svg: r.svg, pngError: null }
            : { ok: false, error: r.error },
        )
        if (aliveRef.current) setResults([...acc])
      }
    } catch (e) {
      if (aliveRef.current) {
        setFatal(e instanceof Error ? e : new Error(String(e)))
      }
    } finally {
      busyRef.current = false
      if (aliveRef.current) setBusy(false)
    }
  }

  function onDownloadSvg(index: number, svg: string) {
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    registerUrl(triggerBlobDownload(blob, `${stem}-${index + 1}.svg`))
  }

  async function onDownloadPng(index: number, svg: string) {
    setPngBusy((prev) => {
      const next = new Set(prev)
      next.add(index)
      return next
    })
    try {
      const blob = await svgToRaster(svg, { format: 'png', scale: 1 })
      registerUrl(triggerBlobDownload(blob, `${stem}-${index + 1}.png`))
      if (!aliveRef.current) return
      setResults((prev) =>
        prev.map((r, i) => (i === index && r.ok ? { ...r, pngError: null } : r)),
      )
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e)
      if (!aliveRef.current) return
      setResults((prev) =>
        prev.map((r, i) =>
          i === index && r.ok
            ? { ...r, pngError: `Could not create PNG: ${detail}` }
            : r,
        ),
      )
    } finally {
      if (aliveRef.current) {
        setPngBusy((prev) => {
          const next = new Set(prev)
          next.delete(index)
          return next
        })
      }
    }
  }

  const visualizeDisabled = busy || source.trim().length === 0
  const viewed = viewing !== null ? results[viewing] : undefined

  return (
    <div className="space-y-6">
      <IoPanel
        title="Source"
        actions={
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            <Trash2 /> Clear
          </Button>
        }
      >
        <div className="space-y-3 border-b p-4">
          <Label htmlFor="mermaid-file" className="text-muted-foreground">
            Open file
          </Label>
          <Input
            id="mermaid-file"
            ref={fileInputRef}
            type="file"
            accept=".mmd,.mermaid,.md,.markdown,.txt"
            className="max-w-xs cursor-pointer"
            onChange={onFileChange}
          />
          {filename ? (
            <p className="text-sm font-medium text-foreground">{filename}</p>
          ) : null}
          {readError ? (
            <p role="alert" className="text-sm text-destructive">
              {readError}
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            Each fence is one diagram; no fence → whole file.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Raw .mmd
              </p>
              <pre
                aria-label="Example raw .mmd"
                className="overflow-x-auto rounded-md bg-background p-3 font-mono text-xs text-foreground"
              >{`flowchart TD
  A-->B`}</pre>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Markdown fences
              </p>
              <pre
                aria-label="Example Markdown fences"
                className="overflow-x-auto rounded-md bg-background p-3 font-mono text-xs text-foreground"
              >{`\`\`\`mermaid
flowchart TD
  A-->B
\`\`\``}</pre>
            </div>
          </div>
        </div>
        <Textarea
          aria-label="Mermaid source"
          className="min-h-[300px] resize-none rounded-none border-0 font-mono focus-visible:ring-0 focus-visible:ring-offset-0"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
      </IoPanel>

      <ActionBar>
        <Button type="button" onClick={onVisualize} disabled={visualizeDisabled}>
          {busy ? 'Visualizing…' : 'Visualize'}
        </Button>
      </ActionBar>

      {results.map((result, index) => (
        <IoPanel
          key={index}
          title={`Diagram ${index + 1}`}
          actions={
            result.ok ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setViewing(index)}
                >
                  <Maximize2 /> View
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onDownloadSvg(index, result.svg)}
                >
                  <Download /> Download SVG
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pngBusy.has(index)}
                  onClick={() => onDownloadPng(index, result.svg)}
                >
                  <Download /> Download PNG
                </Button>
              </>
            ) : null
          }
        >
          {result.ok ? (
            <>
              <button
                type="button"
                aria-label={`View diagram ${index + 1}`}
                className="block max-h-[min(70vh,36rem)] w-full cursor-zoom-in overflow-hidden p-4 text-left"
                onClick={() => setViewing(index)}
              >
                <div dangerouslySetInnerHTML={{ __html: result.svg }} />
              </button>
              {result.pngError ? (
                <p role="alert" className="px-4 pb-4 text-sm text-destructive">
                  {result.pngError}
                </p>
              ) : null}
            </>
          ) : (
            <p role="alert" className="p-4 text-sm text-destructive">
              {result.error}
            </p>
          )}
        </IoPanel>
      ))}

      <DiagramLightbox
        open={Boolean(viewed?.ok)}
        title={viewing !== null ? `Diagram ${viewing + 1}` : ''}
        svg={viewed?.ok ? viewed.svg : ''}
        onClose={() => setViewing(null)}
      />
    </div>
  )
}

export default MermaidTool
