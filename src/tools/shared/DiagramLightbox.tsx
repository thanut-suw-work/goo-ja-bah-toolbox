import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  IDENTITY,
  applyPan,
  applyWheelZoom,
  panZoomStyle,
  type PanZoom,
} from '@/tools/shared/panZoom'

type DiagramLightboxProps = {
  open: boolean
  title: string
  svg: string
  onClose: () => void
}

export function DiagramLightbox({
  open,
  title,
  svg,
  onClose,
}: DiagramLightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState<PanZoom>(IDENTITY)
  const dragRef = useRef<{
    pointerId: number
    lastX: number
    lastY: number
  } | null>(null)

  useLayoutEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open && !el.open) el.showModal()
    return () => {
      if (el.open) el.close()
    }
  }, [open])

  useEffect(() => {
    if (open) setTransform(IDENTITY)
  }, [open, svg])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const viewport = viewportRef.current
    if (viewport === null) return
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      const node = viewportRef.current
      if (node === null) return
      const rect = node.getBoundingClientRect()
      setTransform((t) =>
        applyWheelZoom(t, {
          deltaY: e.deltaY,
          pointerX: e.clientX - rect.left,
          pointerY: e.clientY - rect.top,
        }),
      )
    }
    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onWheel)
  }, [open])

  if (!open) return null

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      pointerId: e.pointerId,
      lastX: e.clientX,
      lastY: e.clientY,
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const dx = e.clientX - drag.lastX
    const dy = e.clientY - drag.lastY
    drag.lastX = e.clientX
    drag.lastY = e.clientY
    setTransform((t) => applyPan(t, dx, dy))
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="diagram-lightbox-title"
      aria-modal="true"
      className="diagram-lightbox flex flex-col overflow-hidden"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <header className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-3">
        <h2
          id="diagram-lightbox-title"
          className="text-sm font-medium uppercase tracking-wider text-muted-foreground"
        >
          {title}
        </h2>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          <X /> Close
        </Button>
      </header>
      <div
        ref={viewportRef}
        className="min-h-0 flex-1 cursor-grab overflow-hidden p-4 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className="inline-block min-w-full select-none"
          style={panZoomStyle(transform)}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </dialog>
  )
}
