import type { OcrDraftSuggestion } from '../ocr/mapRecognizedTextToDraft'

interface Props {
  hasSelectedRow: boolean
  isRunning: boolean
  errorMessage: string | null
  modeLabel: string | null
  rawText: string
  suggestions: OcrDraftSuggestion[]
  onRun: () => void
  onRunSpeciesCodeTest: () => void
  onRunBandNumberTest: () => void
  onApplySuggestions: () => void
}

/** Shows row-level OCR actions, raw OCR output, and basic draft suggestions for the selected row. */
export default function RowOcrPanel({
  hasSelectedRow,
  isRunning,
  errorMessage,
  modeLabel,
  rawText,
  suggestions,
  onRun,
  onRunSpeciesCodeTest,
  onRunBandNumberTest,
  onApplySuggestions,
}: Props) {
  return (
    <section className="card ocr-card">
      <div className="ocr-header">
        <div>
          <h2>Row OCR</h2>
          <p className="panel-copy">
            Run browser OCR on the selected row crop first, then inspect the raw text before trusting any suggested field values.
          </p>
        </div>

        <div className="ocr-actions">
          <button
            className="button primary"
            type="button"
            onClick={onRun}
            disabled={!hasSelectedRow || isRunning}
          >
            {isRunning ? 'Running OCR…' : 'Run OCR on This Row'}
          </button>

          <button
            className="button secondary"
            type="button"
            onClick={onRunSpeciesCodeTest}
            disabled={!hasSelectedRow || isRunning}
          >
            Test Species Code
          </button>

          <button
            className="button secondary"
            type="button"
            onClick={onRunBandNumberTest}
            disabled={!hasSelectedRow || isRunning}
          >
            Test Band Number
          </button>

          <button
            className="button secondary"
            type="button"
            onClick={onApplySuggestions}
            disabled={!hasSelectedRow || isRunning || suggestions.length === 0}
          >
            Apply Basic Prefill
          </button>
        </div>
      </div>

      {!hasSelectedRow ? (
        <div className="empty-panel-state">
          <p>No row selected.</p>
          <span>Select a row before running OCR.</span>
        </div>
      ) : (
        <div className="ocr-results">
          {errorMessage ? <p className="ocr-error">{errorMessage}</p> : null}

          <div className="ocr-result-block">
            <h3>{modeLabel ? `${modeLabel} Result` : 'Raw OCR Text'}</h3>
            {rawText ? (
              <pre className="ocr-raw-text">{rawText}</pre>
            ) : (
              <p className="ocr-placeholder">No OCR output yet for the selected row.</p>
            )}
          </div>

          <div className="ocr-result-block">
            <h3>Basic Suggestions</h3>
            {suggestions.length > 0 ? (
              <ul className="ocr-suggestion-list">
                {suggestions.map((suggestion) => (
                  <li key={`${suggestion.field}-${suggestion.value}`}>
                    <strong>{suggestion.field}</strong>: <code>{suggestion.value}</code> — {suggestion.reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ocr-placeholder">No basic suggestions yet.</p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
