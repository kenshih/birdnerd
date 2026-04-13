import { useEffect, useState } from 'react'
import { FIELD_WINDOWS } from '../ocr/fieldWindows'
import type { RowBox } from '../types'
import { cropImageToDataUrl } from '../utils/cropImage'

/** Shows a zoomed crop of the selected row and provides previous/next navigation. */
interface Props {
  imageUrl: string | null
  rowBoxes: RowBox[]
  selectedIndex: number
  onSelectPrevious: () => void
  onSelectNext: () => void
}

export default function RowCropPreview({
  imageUrl,
  rowBoxes,
  selectedIndex,
  onSelectPrevious,
  onSelectNext,
}: Props) {
  const selectedRow = rowBoxes[selectedIndex] ?? null
  const cropAspectRatio = selectedRow ? `${selectedRow.rect.width} / ${selectedRow.rect.height}` : undefined
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    if (!imageUrl || !selectedRow) {
      setPreviewUrl(null)
      return
    }

    cropImageToDataUrl(imageUrl, selectedRow.rect, { maxDimension: 1800 })
      .then((url) => {
        if (!cancelled) {
          setPreviewUrl(url)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewUrl(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [imageUrl, selectedRow])

  return (
    <section className="card preview-card">
      <div className="preview-header">
        <div>
          <h2>Selected Row</h2>
          <p className="panel-copy">
            Use the row crop preview to confirm geometry before refining the selected row's data.
          </p>
        </div>

        <div className="preview-nav">
          <button
            className="button secondary"
            type="button"
            onClick={onSelectPrevious}
            disabled={selectedIndex <= 0}
          >
            Previous
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={onSelectNext}
            disabled={selectedIndex < 0 || selectedIndex >= rowBoxes.length - 1}
          >
            Next
          </button>
        </div>
      </div>

      {imageUrl && selectedRow ? (
        <div className="crop-shell">
          <div
            className="crop-frame"
            style={{ aspectRatio: cropAspectRatio }}
          >
            {previewUrl ? (
              <img
                className="crop-image crop-image-preview"
                src={previewUrl}
                alt={`Bandsheet row ${selectedIndex + 1}`}
              />
            ) : null}

            {Object.entries(FIELD_WINDOWS).map(([fieldKey, definition]) => (
              <div
                key={fieldKey}
                className={`field-window-overlay field-window-${fieldKey}`}
                style={{
                  left: `${definition.rect.x * 100}%`,
                  top: `${definition.rect.y * 100}%`,
                  width: `${definition.rect.width * 100}%`,
                  height: `${definition.rect.height * 100}%`,
                }}
              >
                <span>{definition.label}</span>
              </div>
            ))}
          </div>

          <div className="crop-meta">
            <span>Row {selectedIndex + 1} of {rowBoxes.length}</span>
            <span>
              x {Math.round(selectedRow.rect.x * 100)}% | y {Math.round(selectedRow.rect.y * 100)}%
            </span>
          </div>
        </div>
      ) : (
        <div className="empty-panel-state">
          <p>No row selected.</p>
          <span>Create and select a row box to preview its crop here.</span>
        </div>
      )}
    </section>
  )
}
