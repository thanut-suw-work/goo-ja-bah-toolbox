import { useEffect, useRef, useState } from 'react'
import { normalizePageRange } from './range'
import {
  downloadBlobs,
  getPdfPageCount,
  renderPagesToBlobs,
  type ImageFormat,
} from './convert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type Step = 1 | 2 | 3

const STEPS: Array<{ step: Step; label: string }> = [
  { step: 1, label: 'Upload' },
  { step: 2, label: 'Range' },
  { step: 3, label: 'Download' },
]

export function PdfToImageTool() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [from, setFrom] = useState(1)
  const [to, setTo] = useState(1)
  const [format, setFormat] = useState<ImageFormat>('png')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState<Step>(1)
  const pendingUrlsRef = useRef<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Revoke any object URL that hasn't been auto-revoked yet when the tool
  // unmounts, so we never leak blob URLs after the component goes away.
  useEffect(() => {
    const pendingUrls = pendingUrlsRef.current
    return () => {
      for (const url of pendingUrls) {
        URL.revokeObjectURL(url)
      }
      pendingUrls.clear()
    }
  }, [])

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null
    setError(null)
    setFile(selected)
    setPageCount(null)
    if (!selected) return
    try {
      const count = await getPdfPageCount(selected)
      setPageCount(count)
      setFrom(1)
      setTo(count)
    } catch (err) {
      setFile(null)
      setError(
        err instanceof Error
          ? `Could not read PDF: ${err.message}`
          : 'Could not read PDF file',
      )
    }
  }

  async function onConvert() {
    if (!file || !pageCount) return
    const range = normalizePageRange(from, to, pageCount)
    if (!range.ok) {
      setError(range.error)
      return
    }
    setError(null)
    setBusy(true)
    try {
      const blobs = await renderPagesToBlobs(file, range.from, range.to, format)
      const url = await downloadBlobs(blobs, format)
      if (url) registerObjectUrl(url)
      setStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
    } finally {
      setBusy(false)
    }
  }

  // Track the object URL so unmount can still revoke it, but also revoke it
  // ourselves shortly after the download starts in the common case where the
  // tool stays mounted (the browser needs a moment to pick up the download).
  function registerObjectUrl(url: string) {
    pendingUrlsRef.current.add(url)
    setTimeout(() => {
      if (pendingUrlsRef.current.delete(url)) {
        URL.revokeObjectURL(url)
      }
    }, 1000)
  }

  function resetAll() {
    setFile(null)
    setPageCount(null)
    setFrom(1)
    setTo(1)
    setError(null)
    setStep(1)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        {STEPS.map(({ step: s, label }) => (
          <li key={s}>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium',
                step === s
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground',
              )}
            >
              <span className="tabular-nums">{s}</span> {label}
            </span>
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload</CardTitle>
            <CardDescription>
              Choose a PDF file from your device. It never leaves your browser.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-input bg-muted/30 px-6 py-8 text-center">
              <Label htmlFor="pdf-file-input" className="text-muted-foreground">
                Choose a PDF file
              </Label>
              <Input
                id="pdf-file-input"
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="max-w-xs cursor-pointer"
                onChange={onFileChange}
              />
              {file ? (
                <p className="text-sm font-medium text-foreground">{file.name}</p>
              ) : null}
              {pageCount !== null ? (
                <p className="text-sm text-muted-foreground">
                  Page count: <span className="font-medium text-foreground">{pageCount}</span>
                </p>
              ) : null}
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="button" disabled={pageCount === null} onClick={() => setStep(2)}>
              Next
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Range &amp; format</CardTitle>
            <CardDescription>
              Choose which pages to convert{pageCount !== null ? ` (1–${pageCount})` : ''} and an
              output format.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="pdf-from">From page</Label>
                <Input
                  id="pdf-from"
                  type="number"
                  min={1}
                  max={pageCount ?? undefined}
                  value={from}
                  onChange={(e) => setFrom(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pdf-to">To page</Label>
                <Input
                  id="pdf-to"
                  type="number"
                  min={1}
                  max={pageCount ?? undefined}
                  value={to}
                  onChange={(e) => setTo(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pdf-format">Format</Label>
                <Select value={format} onValueChange={(v) => setFormat(v as ImageFormat)}>
                  <SelectTrigger id="pdf-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="jpg">JPG</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </CardContent>
          <CardFooter className="justify-between">
            <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={busy}>
              Back
            </Button>
            <Button type="button" onClick={onConvert} disabled={!file || !pageCount || busy}>
              {busy ? 'Converting…' : 'Convert'}
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Download</CardTitle>
            <CardDescription>Your download has started.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {to > from
                ? 'Pages were saved as a zip archive (pages.zip).'
                : `Your image was saved as page.${format === 'jpg' ? 'jpg' : 'png'}.`}
            </p>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="button" onClick={resetAll}>
              Convert another
            </Button>
          </CardFooter>
        </Card>
      ) : null}
    </div>
  )
}

export default PdfToImageTool
