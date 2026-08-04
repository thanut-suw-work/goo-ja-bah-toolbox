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
  const fileRef = useRef<File | null>(null)

  useEffect(() => {
    fileRef.current = file
  }, [file])

  useEffect(() => {
    return () => {
      fileRef.current = null
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
      await downloadBlobs(blobs, format)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
    } finally {
      setBusy(false)
    }
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
