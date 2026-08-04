import * as pdfjsLib from 'pdfjs-dist'
import JSZip from 'jszip'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export type ImageFormat = 'png' | 'jpg'

const MIME_BY_FORMAT: Record<ImageFormat, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
}

async function loadPdf(file: File) {
  const data = await file.arrayBuffer()
  const task = pdfjsLib.getDocument({ data })
  const doc = await task.promise
  return { task, doc }
}

export async function getPdfPageCount(file: File): Promise<number> {
  const { task, doc } = await loadPdf(file)
  try {
    return doc.numPages
  } finally {
    await task.destroy()
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, format: ImageFormat): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to render page to image'))
      },
      MIME_BY_FORMAT[format],
    )
  })
}

export async function renderPagesToBlobs(
  file: File,
  from: number,
  to: number,
  format: ImageFormat,
): Promise<Blob[]> {
  const { task, doc } = await loadPdf(file)
  try {
    const blobs: Blob[] = []
    for (let pageNumber = from; pageNumber <= to; pageNumber++) {
      const page = await doc.getPage(pageNumber)
      try {
        const viewport = page.getViewport({ scale: 2 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const context = canvas.getContext('2d')
        if (!context) {
          throw new Error(`Could not get canvas context for page ${pageNumber}`)
        }
        await page.render({ canvasContext: context, viewport, canvas }).promise
        blobs.push(await canvasToBlob(canvas, format))
      } catch (e) {
        throw new Error(
          `Failed to render page ${pageNumber}: ${e instanceof Error ? e.message : 'unknown error'}`,
        )
      } finally {
        page.cleanup()
      }
    }
    return blobs
  } finally {
    await task.destroy()
  }
}

export async function downloadBlobs(blobs: Blob[], format: ImageFormat): Promise<void> {
  if (blobs.length === 0) return

  const ext = format === 'jpg' ? 'jpg' : 'png'

  if (blobs.length === 1) {
    downloadUrl(URL.createObjectURL(blobs[0]), `page.${ext}`)
    return
  }

  const zip = new JSZip()
  blobs.forEach((blob, i) => {
    const pageNumber = String(i + 1).padStart(3, '0')
    zip.file(`page-${pageNumber}.${ext}`, blob)
  })
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  downloadUrl(URL.createObjectURL(zipBlob), 'pages.zip')
}

function downloadUrl(url: string, filename: string): void {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Defer revoke so the browser has a chance to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
