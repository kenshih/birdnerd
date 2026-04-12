import { useState, type ChangeEvent } from 'react'
import { LEFT_SECTION_FIELDS, type RowDraftFieldKey } from '../rowDraftSchema'
import type { RowBox, RowDraft } from '../types'

interface Props {
  selectedRow: RowBox | null
  selectedIndex: number
  totalRows: number
  onUpdateDraft: (rowId: string, field: keyof RowDraft, value: string) => void
}

type SectionKey = 'left' | 'middle' | 'right'

/** Edits the structured draft data attached to the currently selected row. */
export default function RowDraftEditor({
  selectedRow,
  selectedIndex,
  totalRows,
  onUpdateDraft,
}: Props) {
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    left: true,
    middle: false,
    right: false,
  })

  const handleChange = (field: keyof RowDraft) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!selectedRow) return
    onUpdateDraft(selectedRow.id, field, event.target.value)
  }

  const handleFieldChange = (field: RowDraftFieldKey) => (event: ChangeEvent<HTMLInputElement>) => {
    if (!selectedRow) return
    onUpdateDraft(selectedRow.id, field, event.target.value)
  }

  const toggleSection = (section: SectionKey) => {
    setExpandedSections((current) => ({
      ...current,
      [section]: !current[section],
    }))
  }

  return (
    <section className="card editor-card">
      <div className="editor-header">
        <div>
          <h2>Row Draft</h2>
          <p className="panel-copy">
            Structured row transcription lives here. The current layout mirrors the left side of the physical row first, with more guided inputs coming later.
          </p>
        </div>

        {selectedRow && (
          <div className="editor-meta">
            <span>Row {selectedIndex + 1} of {totalRows}</span>
            <label className="editor-status-field">
              <span>Review Status</span>
              <select value={selectedRow.draft.status} onChange={handleChange('status')}>
                <option value="unreviewed">Unreviewed</option>
                <option value="in-progress">In Progress</option>
                <option value="reviewed">Reviewed</option>
              </select>
            </label>
          </div>
        )}
      </div>

      {selectedRow ? (
        <div className="editor-sections">
          <section className="editor-section">
            <button
              type="button"
              className="editor-section-toggle"
              onClick={() => toggleSection('left')}
              aria-expanded={expandedSections.left}
            >
              <div className="editor-section-header">
                <h3>Left Section</h3>
              </div>
              <span className="editor-section-indicator">{expandedSections.left ? 'Hide' : 'Show'}</span>
            </button>

            {expandedSections.left && (
              <div className="editor-grid editor-grid-left">
                {LEFT_SECTION_FIELDS.map(({ key, label, placeholder, compact, wide, options }) => (
                  <label
                    key={key}
                    className={`editor-field${compact ? ' is-compact' : ''}${wide ? ' is-wide' : ''}`}
                  >
                    <span>{label}</span>
                    <input
                      type="text"
                      value={selectedRow.draft[key]}
                      placeholder={placeholder}
                      list={options ? `ocr-options-${key}` : undefined}
                      onChange={handleFieldChange(key)}
                    />
                    {options ? (
                      <datalist id={`ocr-options-${key}`}>
                        {options.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.label}
                          </option>
                        ))}
                      </datalist>
                    ) : null}
                  </label>
                ))}

              </div>
            )}
          </section>

          <section className="editor-section">
            <button
              type="button"
              className="editor-section-toggle"
              onClick={() => toggleSection('middle')}
              aria-expanded={expandedSections.middle}
            >
              <div className="editor-section-header">
                <h3>Middle Section</h3>
              </div>
              <span className="editor-section-indicator">{expandedSections.middle ? 'Hide' : 'Show'}</span>
            </button>
            {expandedSections.middle && (
              <div className="editor-section-placeholder">
                Add middle-column row fields here once we expand beyond the left-side draft set.
              </div>
            )}
          </section>

          <section className="editor-section">
            <button
              type="button"
              className="editor-section-toggle"
              onClick={() => toggleSection('right')}
              aria-expanded={expandedSections.right}
            >
              <div className="editor-section-header">
                <h3>Right Section</h3>
              </div>
              <span className="editor-section-indicator">{expandedSections.right ? 'Hide' : 'Show'}</span>
            </button>
            {expandedSections.right && (
              <div className="editor-section-placeholder">
                Keep this space open for later right-side transcription fields and notes.
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="empty-panel-state">
          <p>No row selected.</p>
          <span>Select a row box to begin attaching structured draft data.</span>
        </div>
      )}
    </section>
  )
}
