import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { NormalizedRect, ResizeHandle, RowBox } from '../types'
import { isMeaningfulRect, makeNormalizedRect, rectToPercentStyle, resizeRect } from '../utils/rect'

/** Renders the full-sheet image with a draw-on-top overlay for manual row boxes. */
interface Props {
  imageUrl: string
  zoom: number
  rowBoxes: RowBox[]
  selectedRowId: string | null
  onAddRow: (rect: NormalizedRect) => void
  onUpdateRow: (rowId: string, rect: NormalizedRect) => void
  onSelectRow: (rowId: string) => void
}

interface DraftBox {
  pointerId: number
  rect: NormalizedRect
}

interface ResizeDraft {
  pointerId: number
  rowId: string
  handle: ResizeHandle
}

const RESIZE_HANDLES: ResizeHandle[] = [
  'top-left',
  'top',
  'top-right',
  'right',
  'bottom-right',
  'bottom',
  'bottom-left',
  'left',
]

export default function SheetAnnotator({
  imageUrl,
  zoom,
  rowBoxes,
  selectedRowId,
  onAddRow,
  onUpdateRow,
  onSelectRow,
}: Props) {
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const [draftBox, setDraftBox] = useState<DraftBox | null>(null)
  const [resizeDraft, setResizeDraft] = useState<ResizeDraft | null>(null)

  const getNormalizedPoint = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = overlayRef.current?.getBoundingClientRect()
    if (!bounds || bounds.width === 0 || bounds.height === 0) return null

    return {
      x: (event.clientX - bounds.left) / bounds.width,
      y: (event.clientY - bounds.top) / bounds.height,
    }
  }

  const beginDraw = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return

    const point = getNormalizedPoint(event)
    if (!point) return

    // We keep coordinates normalized to the rendered image so boxes survive zoom changes.
    const rect = makeNormalizedRect(point.x, point.y, point.x, point.y)
    event.currentTarget.setPointerCapture(event.pointerId)
    setDraftBox({ pointerId: event.pointerId, rect })
  }

  const updateDraw = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (resizeDraft) {
      const point = getNormalizedPoint(event)
      if (!point || resizeDraft.pointerId !== event.pointerId) return

      const row = rowBoxes.find((rowBox) => rowBox.id === resizeDraft.rowId)
      if (!row) return

      const resizedRect = resizeRect(row.rect, resizeDraft.handle, point.x, point.y)
      if (isMeaningfulRect(resizedRect)) {
        onUpdateRow(row.id, resizedRect)
      }
      return
    }

    if (!draftBox || draftBox.pointerId !== event.pointerId) return

    const point = getNormalizedPoint(event)
    if (!point) return

    setDraftBox({
      pointerId: event.pointerId,
      rect: makeNormalizedRect(draftBox.rect.x, draftBox.rect.y, point.x, point.y),
    })
  }

  const endDraw = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (resizeDraft && resizeDraft.pointerId === event.pointerId) {
      event.currentTarget.releasePointerCapture(event.pointerId)
      setResizeDraft(null)
      return
    }

    if (!draftBox || draftBox.pointerId !== event.pointerId) return

    event.currentTarget.releasePointerCapture(event.pointerId)
    if (isMeaningfulRect(draftBox.rect)) {
      onAddRow(draftBox.rect)
    }
    setDraftBox(null)
  }

  const beginResize = (
    event: ReactPointerEvent<HTMLButtonElement>,
    rowId: string,
    handle: ResizeHandle,
  ) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setResizeDraft({
      pointerId: event.pointerId,
      rowId,
      handle,
    })
  }

  return (
    <div className="image-scroll">
      <div className="annotator-stage" style={{ width: `${zoom * 100}%` }}>
        <img
          className="sheet-image"
          src={imageUrl}
          alt="Uploaded bandsheet"
        />

        <div
          ref={overlayRef}
          className="annotator-overlay"
          onPointerDown={beginDraw}
          onPointerMove={updateDraw}
          onPointerUp={endDraw}
          onPointerCancel={endDraw}
        >
          {rowBoxes.map((rowBox, index) => (
            <button
              key={rowBox.id}
              type="button"
              className={`row-box${rowBox.id === selectedRowId ? ' is-selected' : ''}`}
              style={rectToPercentStyle(rowBox.rect)}
              onClick={() => onSelectRow(rowBox.id)}
              title={`Select row ${index + 1}`}
            >
              <span className="row-box-label">{index + 1}</span>
              {rowBox.id === selectedRowId && (
                <>
                  {RESIZE_HANDLES.map((handle) => (
                    <button
                      key={handle}
                      type="button"
                      className={`resize-handle resize-handle-${handle}`}
                      onPointerDown={(event) => beginResize(event, rowBox.id, handle)}
                      title={`Resize row using ${handle} handle`}
                    />
                  ))}
                </>
              )}
            </button>
          ))}

          {draftBox && (
            <div
              className="row-box is-draft"
              style={rectToPercentStyle(draftBox.rect)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
