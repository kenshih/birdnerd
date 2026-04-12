import { useState, type ChangeEvent } from 'react'
import type { RowBox, RowDraft } from '../types'

interface Props {
  selectedRow: RowBox | null
  selectedIndex: number
  totalRows: number
  onUpdateDraft: (rowId: string, field: keyof RowDraft, value: string) => void
}

type DraftField = {
  field: keyof Omit<RowDraft, 'status'>
  label: string
  placeholder?: string
  compact?: boolean
  wide?: boolean
}

const LEFT_FIELDS: DraftField[] = [
  { field: 'banderInitials', label: "Bander's Initials", placeholder: 'e.g. HD', compact: true },
  { field: 'code', label: 'Code', placeholder: 'e.g. N or R', compact: true },
  { field: 'bandNumber', label: 'Band Number', placeholder: 'e.g. 1231-45678', wide: true },
  { field: 'speciesCode', label: 'Species Alpha', placeholder: 'e.g. SOSP', compact: true },
  { field: 'age', label: 'Age', placeholder: 'e.g. HY', compact: true },
  { field: 'howAged', label: 'How Aged', placeholder: 'e.g. CP', compact: true },
  { field: 'wrpCode', label: 'WRP Code', placeholder: 'e.g. DPAM', compact: true },
  { field: 'sex', label: 'Sex', placeholder: 'e.g. M', compact: true },
  { field: 'howSexed', label: 'How Sexed', placeholder: 'e.g. BP', compact: true },
  { field: 'skull', label: 'Skull', placeholder: 'e.g. 3', compact: true },
  { field: 'cloacalProtuberance', label: 'Cl. Prot.', placeholder: 'e.g. 2', compact: true },
  { field: 'broodPatch', label: 'Br. Patch', placeholder: 'e.g. 3', compact: true },
  { field: 'fat', label: 'Fat', placeholder: 'e.g. 1', compact: true },
  { field: 'bodyMolt', label: 'Body Mlt', placeholder: 'e.g. 0', compact: true },
  { field: 'flightFeatherMolt', label: 'FF Molt', placeholder: 'e.g. N', compact: true },
  { field: 'flightFeatherWear', label: 'FF Wear', placeholder: 'e.g. L', compact: true },
  { field: 'juvenileBodyPlumage', label: 'Juv Body Pl', placeholder: 'e.g. J', compact: true },
]

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
            Structured row transcription starts here. This is a first-pass field set before OCR, validation, or export helpers are added.
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
                {LEFT_FIELDS.map(({ field, label, placeholder, compact, wide }) => (
                  <label
                    key={field}
                    className={`editor-field${compact ? ' is-compact' : ''}${wide ? ' is-wide' : ''}`}
                  >
                    <span>{label}</span>
                    <input
                      type="text"
                      value={selectedRow.draft[field]}
                      placeholder={placeholder}
                      onChange={handleChange(field)}
                    />
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
