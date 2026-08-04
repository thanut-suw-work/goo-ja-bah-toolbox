import { useEffect, useRef, useState } from 'react'
import { normalizePageRange } from './range'
import {
  downloadBlobs,
  getPdfPageCount,
  renderPagesToBlobs,
  type ImageFormat,
} from './convert'

export function PdfToImageTool() {
  const [file, setFile] = useState<File | null>(null)
  const [pageCount, setPageCount] = useState<number | null>(null)
  const [from, setFrom] = useState(1)
  const [to, setTo] = useState(1)
  const [format, setFormat] = useState<ImageFormat>('png')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pendingUrlsRef = useRef<Set<string>>(new Set())

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

  return (
    <div>
      <label>
        PDF file
        <input type="file" accept="application/pdf" onChange={onFileChange} />
      </label>

      {pageCount !== null ? <p>Page count: {pageCount}</p> : null}

      <label>
        From page
        <input
          type="number"
          min={1}
          max={pageCount ?? undefined}
          value={from}
          onChange={(e) => setFrom(Number(e.target.value))}
        />
      </label>

      <label>
        To page
        <input
          type="number"
          min={1}
          max={pageCount ?? undefined}
          value={to}
          onChange={(e) => setTo(Number(e.target.value))}
        />
      </label>

      <label>
        Format
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as ImageFormat)}
        >
          <option value="png">PNG</option>
          <option value="jpg">JPG</option>
        </select>
      </label>

      <button type="button" onClick={onConvert} disabled={!file || !pageCount || busy}>
        {busy ? 'Converting…' : 'Convert'}
      </button>

      {error ? <p role="alert">{error}</p> : null}
    </div>
  )
}

export default PdfToImageTool
