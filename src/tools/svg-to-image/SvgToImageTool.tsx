import { useEffect, useRef, useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ActionBar, IoPanel } from '@/tools/shared/IoPanels'
import {
  svgToRaster,
  type RasterFormat,
  type RasterScale,
} from '@/tools/shared/svgToRaster'
import { DEFAULT_STEM, stemFromFilename } from './stem'

function clampJpegPct(n: number): number {
  if (!Number.isFinite(n)) return 92
  return Math.min(100, Math.max(10, Math.round(n)))
}

function triggerDownload(url: string, filename: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export function SvgToImageTool() {
  const [sourceText, setSourceText] = useState('')
  const [fileLabel, setFileLabel] = useState<string | null>(null)
  const [stem, setStem] = useState(DEFAULT_STEM)
  const [format, setFormat] = useState<RasterFormat>('png')
  const [scale, setScale] = useState<RasterScale>(2)
  const [jpegPct, setJpegPct] = useState(92)
  const [busy, setBusy] = useState(false)
  const [sourceError, setSourceError] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [downloadName, setDownloadName] = useState<string | null>(null)
  const pendingUrlsRef = useRef<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  function revokeAll(): void {
    for (const url of pendingUrlsRef.current) {
      URL.revokeObjectURL(url)
    }
    pendingUrlsRef.current.clear()
    setPreviewUrl(null)
  }

  useEffect(() => {
    const pending = pendingUrlsRef.current
    return () => {
      for (const url of pending) {
        URL.revokeObjectURL(url)
      }
      pending.clear()
    }
  }, [])

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      setSourceText(text)
      setFileLabel(file.name)
      setStem(stemFromFilename(file.name))
      setSourceError(null)
    } catch {
      setSourceError('Could not read file')
    }
  }

  function onClear() {
    setSourceText('')
    setFileLabel(null)
    setStem(DEFAULT_STEM)
    setSourceError(null)
    setPreviewError(null)
    setDownloadName(null)
    revokeAll()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function onConvert() {
    if (!sourceText.trim() || busy) return
    setPreviewError(null)
    setDownloadName(null)
    revokeAll()
    setBusy(true)
    try {
      const blob = await svgToRaster(sourceText, {
        format,
        scale,
        quality: format === 'jpeg' ? jpegPct / 100 : undefined,
      })
      const url = URL.createObjectURL(blob)
      pendingUrlsRef.current.add(url)
      setPreviewUrl(url)
      const ext = format === 'jpeg' ? 'jpg' : 'png'
      setDownloadName(`${stem}.${ext}`)
    } catch (err) {
      setPreviewUrl(null)
      setPreviewError(
        err instanceof Error ? err.message : 'Could not create image: unknown error',
      )
    } finally {
      setBusy(false)
    }
  }

  const jpegDisabled = format === 'png'

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
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
          <Label htmlFor="svg-file-input">SVG file</Label>
          <Input
            id="svg-file-input"
            ref={fileInputRef}
            type="file"
            accept=".svg,image/svg+xml,.txt"
            className="max-w-xs cursor-pointer"
            onChange={onFileChange}
          />
          {fileLabel ? (
            <p className="text-sm font-medium text-foreground">{fileLabel}</p>
          ) : null}
        </div>
        {sourceError ? (
          <p role="alert" className="px-4 py-2 text-sm text-destructive">
            {sourceError}
          </p>
        ) : null}
        <Textarea
          aria-label="SVG source"
          className="min-h-[300px] resize-none rounded-none border-0 font-mono focus-visible:ring-0 focus-visible:ring-offset-0"
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
        />
      </IoPanel>

      <ActionBar>
        <label className="flex items-center gap-2 text-sm">
          Format
          <select
            aria-label="Format"
            className="rounded-md border border-input bg-background px-2 py-1"
            value={format}
            onChange={(e) => setFormat(e.target.value as RasterFormat)}
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Scale
          <select
            aria-label="Scale"
            className="rounded-md border border-input bg-background px-2 py-1"
            value={scale}
            onChange={(e) =>
              setScale(Number(e.target.value) as RasterScale)
            }
          >
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={3}>3×</option>
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Label htmlFor="svg-jpeg-quality">JPEG quality</Label>
          <input
            id="svg-jpeg-quality"
            type="range"
            min={10}
            max={100}
            step={1}
            value={jpegPct}
            disabled={jpegDisabled}
            onChange={(e) => setJpegPct(clampJpegPct(Number(e.target.value)))}
            aria-label="JPEG quality"
          />
          <Input
            type="number"
            min={10}
            max={100}
            value={jpegPct}
            disabled={jpegDisabled}
            onChange={(e) => setJpegPct(clampJpegPct(Number(e.target.value)))}
            className="w-20"
            aria-label="JPEG quality percent"
          />
        </div>
        <Button
          type="button"
          onClick={onConvert}
          disabled={!sourceText.trim() || busy}
        >
          {busy ? 'Converting…' : 'Convert'}
        </Button>
      </ActionBar>

      <IoPanel
        title="Preview"
        actions={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!previewUrl || !downloadName}
            onClick={() => {
              if (previewUrl && downloadName) {
                triggerDownload(previewUrl, downloadName)
              }
            }}
          >
            <Download /> Download
          </Button>
        }
      >
        <div className="overflow-auto p-4">
          {previewError ? (
            <p role="alert" className="text-sm text-destructive">
              {previewError}
            </p>
          ) : null}
          {previewUrl ? (
            <img
              alt="Raster preview"
              src={previewUrl}
              className="h-auto max-w-full"
            />
          ) : null}
        </div>
      </IoPanel>
    </div>
  )
}

export default SvgToImageTool
