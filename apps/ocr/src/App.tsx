import { useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import SheetAnnotator from './components/SheetAnnotator'
import RowCropPreview from './components/RowCropPreview'
import RowDraftEditor from './components/RowDraftEditor'
import RowExportPreview from './components/RowExportPreview'
import RowList from './components/RowList'
import { useObjectUrl } from './hooks/useObjectUrl'
import type { NormalizedRect, RowBox, RowDraft } from './types'
import { getExportCsv, getExportRecords } from './utils/exportRows'

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

function makeRowId() {
  return `row-${crypto.randomUUID()}`
}

function makeEmptyDraft(): RowDraft {
  return {
    banderInitials: '',
    code: '',
    bandNumber: '',
    speciesCode: '',
    age: '',
    howAged: '',
    howSexed: '',
    wrpCode: '',
    sex: '',
    skull: '',
    cloacalProtuberance: '',
    broodPatch: '',
    fat: '',
    bodyMolt: '',
    flightFeatherMolt: '',
    flightFeatherWear: '',
    juvenileBodyPlumage: '',
    status: 'unreviewed',
  }
}

export default function App() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [zoom, setZoom] = useState<typeof ZOOM_LEVELS[number]>(1)
  const [rowBoxes, setRowBoxes] = useState<RowBox[]>([])
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)

  const imageUrl = useObjectUrl(selectedFile)
  const selectedRowIndex = rowBoxes.findIndex((rowBox) => rowBox.id === selectedRowId)
  const selectedRow = selectedRowIndex >= 0 ? rowBoxes[selectedRowIndex] : null
  const exportRecords = getExportRecords(rowBoxes)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setZoom(1)
    setRowBoxes([])
    setSelectedRowId(null)
  }

  const clearSheet = () => {
    setSelectedFile(null)
    setZoom(1)
    setRowBoxes([])
    setSelectedRowId(null)
  }

  const addRow = (rect: NormalizedRect) => {
    const newRow = { id: makeRowId(), rect, draft: makeEmptyDraft() }
    setRowBoxes((current) => [...current, newRow])
    setSelectedRowId(newRow.id)
  }

  const updateRow = (rowId: string, rect: NormalizedRect) => {
    setRowBoxes((current) =>
      current.map((rowBox) =>
        rowBox.id === rowId ? { ...rowBox, rect } : rowBox
      )
    )
  }

  const updateRowDraft = (rowId: string, field: keyof RowDraft, value: string) => {
    setRowBoxes((current) =>
      current.map((rowBox) =>
        rowBox.id === rowId
          ? { ...rowBox, draft: { ...rowBox.draft, [field]: value } }
          : rowBox
      )
    )
  }

  const deleteSelectedRow = () => {
    if (!selectedRowId) return

    setRowBoxes((current) => {
      const nextRows = current.filter((rowBox) => rowBox.id !== selectedRowId)
      const nextSelection = nextRows[Math.min(selectedRowIndex, nextRows.length - 1)] ?? null
      setSelectedRowId(nextSelection?.id ?? null)
      return nextRows
    })
  }

  const selectPreviousRow = () => {
    if (selectedRowIndex <= 0) return
    setSelectedRowId(rowBoxes[selectedRowIndex - 1]?.id ?? null)
  }

  const selectNextRow = () => {
    if (selectedRowIndex < 0 || selectedRowIndex >= rowBoxes.length - 1) return
    setSelectedRowId(rowBoxes[selectedRowIndex + 1]?.id ?? null)
  }

  const exportCsv = () => {
    if (exportRecords.length === 0) return

    const csv = getExportCsv(exportRecords)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)

    anchor.href = url
    anchor.download = `birdnerd-ocr-rows-${date}.csv`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-header">
          <div>
            <p className="eyebrow">BirdNerd OCR 0.2.1</p>
            <h1>Manual Row Selection</h1>
            <p className="lede">
              Draw row boxes directly on the sheet, select a row, and confirm the
              crop before we move on to row editing and CSV export.
            </p>
          </div>

          <div className="meta">
            <span>Version {__APP_VERSION__}</span>
            <a href="/birdnerd/" className="link">Open field app</a>
          </div>
        </div>

        <section className="toolbar card">
          <div className="toolbar-copy">
            <h2>Sheet Intake</h2>
            <p>
              Upload one photo or scan of the supported bandsheet layout. For
              this slice, row selection is fully manual so we can keep the
              geometry and review flow easy to reason about.
            </p>
          </div>

          <div className="toolbar-actions">
            <label className="button primary">
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
              {selectedFile ? 'Replace sheet image' : 'Upload sheet image'}
            </label>

            <button
              className="button secondary"
              type="button"
              onClick={clearSheet}
              disabled={!selectedFile}
            >
              Clear
            </button>
          </div>
        </section>

        <section className="workspace">
          <article className="viewer card viewer-card">
            <div className="viewer-topbar">
              <div>
                <h2>Full Sheet Viewer</h2>
                <p>
                  {selectedFile
                    ? `Loaded: ${selectedFile.name}`
                    : 'No sheet loaded yet.'}
                </p>
              </div>

              <div className="zoom-controls">
                <label htmlFor="zoom-level">Zoom</label>
                <select
                  id="zoom-level"
                  value={String(zoom)}
                  onChange={(event) => setZoom(Number(event.target.value) as typeof ZOOM_LEVELS[number])}
                  disabled={!selectedFile}
                >
                  {ZOOM_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {Math.round(level * 100)}%
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="viewer-surface">
              {imageUrl ? (
                <SheetAnnotator
                  imageUrl={imageUrl}
                  zoom={zoom}
                  rowBoxes={rowBoxes}
                  selectedRowId={selectedRowId}
                  onAddRow={addRow}
                  onUpdateRow={updateRow}
                  onSelectRow={setSelectedRowId}
                />
              ) : (
                <div className="empty-state">
                  <p>No bandsheet image loaded.</p>
                  <span>Upload a photo or scan to begin the review workflow.</span>
                </div>
              )}
            </div>
          </article>

          <div className="review-column">
            <RowList
              rowBoxes={rowBoxes}
              selectedRowId={selectedRowId}
              onSelectRow={setSelectedRowId}
              onDeleteSelectedRow={deleteSelectedRow}
            />

            <RowCropPreview
              imageUrl={imageUrl}
              rowBoxes={rowBoxes}
              selectedIndex={selectedRowIndex}
              onSelectPrevious={selectPreviousRow}
              onSelectNext={selectNextRow}
            />

            <RowDraftEditor
              selectedRow={selectedRow}
              selectedIndex={selectedRowIndex}
              totalRows={rowBoxes.length}
              onUpdateDraft={updateRowDraft}
            />

            <RowExportPreview
              records={exportRecords}
              onExportCsv={exportCsv}
            />
          </div>
        </section>

        {needRefresh && (
          <button className="update" onClick={() => updateServiceWorker(true)}>
            Update OCR app
          </button>
        )}
      </section>
    </main>
  )
}
