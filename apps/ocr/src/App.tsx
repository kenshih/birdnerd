import { useCallback, useMemo, useState } from 'react'
import { FIELD_WINDOWS, getFieldWindowRect, type FocusedOcrField } from './ocr/fieldWindows'
import { useRegisterSW } from 'virtual:pwa-register/react'
import type { OcrDraftSuggestion } from './ocr/mapRecognizedTextToDraft'
import { mapFocusedRecognizedTextToDraft, mapRecognizedTextToDraft } from './ocr/mapRecognizedTextToDraft'
import {
  BAND_NUMBER_OCR_PRESET,
  DEFAULT_ROW_OCR_PRESET,
  SPECIES_CODE_OCR_PRESET,
  recognizeRow,
  type RowOcrPreset,
} from './ocr/recognizeRow'
import SheetAnnotator from './components/SheetAnnotator'
import RowCropPreview from './components/RowCropPreview'
import RowDraftEditor from './components/RowDraftEditor'
import RowExportPreview from './components/RowExportPreview'
import RowList from './components/RowList'
import RowOcrPanel from './components/RowOcrPanel'
import { useObjectUrl } from './hooks/useObjectUrl'
import { createEmptyRowDraft } from './rowDraftSchema'
import type { NormalizedRect, RowBox, RowDraft } from './types'
import { getExportCsv, getExportRecords } from './utils/exportRows'

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5] as const

function makeRowId() {
  return `row-${crypto.randomUUID()}`
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
  const [ocrRunningRowId, setOcrRunningRowId] = useState<string | null>(null)
  const [ocrRawTextByRowId, setOcrRawTextByRowId] = useState<Record<string, string>>({})
  const [ocrSuggestionsByRowId, setOcrSuggestionsByRowId] = useState<Record<string, OcrDraftSuggestion[]>>({})
  const [ocrErrorByRowId, setOcrErrorByRowId] = useState<Record<string, string | null>>({})
  const [ocrModeLabelByRowId, setOcrModeLabelByRowId] = useState<Record<string, string>>({})
  const [focusedOcrByRowId, setFocusedOcrByRowId] = useState<
    Record<string, Partial<Record<FocusedOcrField, FocusedOcrResultState>>>
  >({})

  const imageUrl = useObjectUrl(selectedFile)
  const selectedRowIndex = rowBoxes.findIndex((rowBox) => rowBox.id === selectedRowId)
  const selectedRow = selectedRowIndex >= 0 ? rowBoxes[selectedRowIndex] : null
  const exportRecords = useMemo(() => getExportRecords(rowBoxes), [rowBoxes])
  const selectedRowRawText = selectedRow ? ocrRawTextByRowId[selectedRow.id] ?? '' : ''
  const selectedRowSuggestions = selectedRow ? ocrSuggestionsByRowId[selectedRow.id] ?? [] : []
  const selectedRowError = selectedRow ? ocrErrorByRowId[selectedRow.id] ?? null : null
  const selectedRowModeLabel = selectedRow ? ocrModeLabelByRowId[selectedRow.id] ?? null : null
  const selectedRowFocusedResults = selectedRow
    ? getFocusedResultCards(focusedOcrByRowId[selectedRow.id] ?? {})
    : []

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setZoom(1)
    setRowBoxes([])
    setSelectedRowId(null)
    setOcrRunningRowId(null)
    setOcrRawTextByRowId({})
    setOcrSuggestionsByRowId({})
    setOcrErrorByRowId({})
    setOcrModeLabelByRowId({})
    setFocusedOcrByRowId({})
  }

  const clearSheet = () => {
    setSelectedFile(null)
    setZoom(1)
    setRowBoxes([])
    setSelectedRowId(null)
    setOcrRunningRowId(null)
    setOcrRawTextByRowId({})
    setOcrSuggestionsByRowId({})
    setOcrErrorByRowId({})
    setOcrModeLabelByRowId({})
    setFocusedOcrByRowId({})
  }

  const addRow = useCallback((rect: NormalizedRect) => {
    const newRow = { id: makeRowId(), rect, draft: createEmptyRowDraft() }
    setRowBoxes((current) => [...current, newRow])
    setSelectedRowId(newRow.id)
  }, [])

  const updateRow = useCallback((rowId: string, rect: NormalizedRect) => {
    setRowBoxes((current) =>
      current.map((rowBox) =>
        rowBox.id === rowId ? { ...rowBox, rect } : rowBox
      )
    )
  }, [])

  const updateRowDraft = useCallback((rowId: string, field: keyof RowDraft, value: string) => {
    setRowBoxes((current) =>
      current.map((rowBox) =>
        rowBox.id === rowId
          ? { ...rowBox, draft: { ...rowBox.draft, [field]: value } }
          : rowBox
      )
    )
  }, [])

  const deleteSelectedRow = useCallback(() => {
    if (!selectedRowId) return

    setRowBoxes((current) => {
      const nextRows = current.filter((rowBox) => rowBox.id !== selectedRowId)
      const nextSelection = nextRows[Math.min(selectedRowIndex, nextRows.length - 1)] ?? null
      setSelectedRowId(nextSelection?.id ?? null)
      return nextRows
    })

    setOcrRawTextByRowId((current) => omitRowKey(current, selectedRowId))
    setOcrSuggestionsByRowId((current) => omitRowKey(current, selectedRowId))
    setOcrErrorByRowId((current) => omitRowKey(current, selectedRowId))
    setOcrModeLabelByRowId((current) => omitRowKey(current, selectedRowId))
    setFocusedOcrByRowId((current) => omitRowKey(current, selectedRowId))
  }, [selectedRowId, selectedRowIndex])

  const selectPreviousRow = useCallback(() => {
    if (selectedRowIndex <= 0) return
    setSelectedRowId(rowBoxes[selectedRowIndex - 1]?.id ?? null)
  }, [rowBoxes, selectedRowIndex])

  const selectNextRow = useCallback(() => {
    if (selectedRowIndex < 0 || selectedRowIndex >= rowBoxes.length - 1) return
    setSelectedRowId(rowBoxes[selectedRowIndex + 1]?.id ?? null)
  }, [rowBoxes, selectedRowIndex])

  const exportCsv = useCallback(() => {
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
  }, [exportRecords])

  const runOcrOnSelectedRow = async (
    preset: RowOcrPreset = DEFAULT_ROW_OCR_PRESET,
    mapper: (text: string) => OcrDraftSuggestion[] = mapRecognizedTextToDraft,
  ) => {
    if (!selectedRow || !imageUrl) return

    setOcrRunningRowId(selectedRow.id)
    setOcrErrorByRowId((current) => ({ ...current, [selectedRow.id]: null }))
    setOcrModeLabelByRowId((current) => ({ ...current, [selectedRow.id]: preset.label }))

    try {
      const result = await recognizeRow(imageUrl, selectedRow.rect, preset)
      const rawText = result.data.text.trim()
      const suggestions = mapper(rawText)

      setOcrRawTextByRowId((current) => ({ ...current, [selectedRow.id]: rawText }))
      setOcrSuggestionsByRowId((current) => ({ ...current, [selectedRow.id]: suggestions }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'OCR failed for the selected row.'
      setOcrErrorByRowId((current) => ({ ...current, [selectedRow.id]: message }))
    } finally {
      setOcrRunningRowId(null)
    }
  }

  const applyOcrSuggestionsToSelectedRow = () => {
    if (!selectedRow) return

    const suggestions = [
      ...(ocrSuggestionsByRowId[selectedRow.id] ?? []),
      ...Object.values(focusedOcrByRowId[selectedRow.id] ?? {}).flatMap((result) => result?.suggestions ?? []),
    ]
    if (suggestions.length === 0) return

    setRowBoxes((current) =>
      current.map((rowBox) => {
        if (rowBox.id !== selectedRow.id) return rowBox

        const nextDraft = { ...rowBox.draft }
        for (const suggestion of suggestions) {
          if (!nextDraft[suggestion.field].trim()) {
            nextDraft[suggestion.field] = suggestion.value
          }
        }

        if (nextDraft.status === 'unreviewed') {
          nextDraft.status = 'in-progress'
        }

        return { ...rowBox, draft: nextDraft }
      })
    )
  }

  const runFocusedFieldOcrTest = async (field: FocusedOcrField, preset: RowOcrPreset) => {
    if (!selectedRow || !imageUrl) return

    const fieldRect = getFieldWindowRect(selectedRow.rect, field)
    setOcrRunningRowId(selectedRow.id)

    setFocusedOcrByRowId((current) => ({
      ...current,
      [selectedRow.id]: {
        ...(current[selectedRow.id] ?? {}),
        [field]: {
          ...(current[selectedRow.id]?.[field] ?? createEmptyFocusedResultState()),
          errorMessage: null,
        },
      },
    }))

    try {
      const result = await recognizeRow(imageUrl, fieldRect, preset)
      const rawText = result.data.text.trim()
      const suggestions = mapFocusedRecognizedTextToDraft(field, rawText)

      setFocusedOcrByRowId((current) => ({
        ...current,
        [selectedRow.id]: {
          ...(current[selectedRow.id] ?? {}),
          [field]: {
            rawText,
            suggestions,
            errorMessage: null,
          },
        },
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Focused OCR failed for the selected field.'

      setFocusedOcrByRowId((current) => ({
        ...current,
        [selectedRow.id]: {
          ...(current[selectedRow.id] ?? {}),
          [field]: {
            ...(current[selectedRow.id]?.[field] ?? createEmptyFocusedResultState()),
            errorMessage: message,
          },
        },
      }))
    } finally {
      setOcrRunningRowId(null)
    }
  }

  const runSpeciesCodeOcrTest = () => runFocusedFieldOcrTest('speciesCode', SPECIES_CODE_OCR_PRESET)

  const runBandNumberOcrTest = () => runFocusedFieldOcrTest('bandNumber', BAND_NUMBER_OCR_PRESET)

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-header">
          <div>
            <p className="eyebrow">BirdNerd OCR {__APP_VERSION__}</p>
            <h1>Bandsheet Review Workspace</h1>
            <p className="lede">
              Upload a bandsheet image, define rows, review structured row data,
              and export the current draft set as CSV.
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
              Upload one photo or scan of the supported bandsheet layout. Row
              selection is still manual, which keeps the geometry and review
              workflow easy to inspect while the OCR workflow is still taking shape.
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

            <RowOcrPanel
              hasSelectedRow={Boolean(selectedRow)}
              isRunning={selectedRow ? ocrRunningRowId === selectedRow.id : false}
              errorMessage={selectedRowError}
              modeLabel={selectedRowModeLabel}
              rawText={selectedRowRawText}
              suggestions={selectedRowSuggestions}
              focusedResults={selectedRowFocusedResults}
              onRun={() => runOcrOnSelectedRow()}
              onRunSpeciesCodeTest={runSpeciesCodeOcrTest}
              onRunBandNumberTest={runBandNumberOcrTest}
              onApplySuggestions={applyOcrSuggestionsToSelectedRow}
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

function omitRowKey<T>(record: Record<string, T>, rowId: string | null): Record<string, T> {
  if (!rowId || !(rowId in record)) {
    return record
  }

  const nextRecord = { ...record }
  delete nextRecord[rowId]
  return nextRecord
}

interface FocusedOcrResultState {
  rawText: string
  suggestions: OcrDraftSuggestion[]
  errorMessage: string | null
}

function createEmptyFocusedResultState(): FocusedOcrResultState {
  return {
    rawText: '',
    suggestions: [],
    errorMessage: null,
  }
}

function getFocusedResultCards(
  record: Partial<Record<FocusedOcrField, FocusedOcrResultState>>,
) {
  return (Object.keys(FIELD_WINDOWS) as FocusedOcrField[]).map((field) => ({
    field,
    label: FIELD_WINDOWS[field].label,
    rawText: record[field]?.rawText ?? '',
    suggestions: record[field]?.suggestions ?? [],
    errorMessage: record[field]?.errorMessage ?? null,
  }))
}
