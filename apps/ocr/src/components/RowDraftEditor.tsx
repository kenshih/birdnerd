import type { ChangeEvent } from 'react'
import type { RowBox, RowDraft } from '../types'

interface Props {
  selectedRow: RowBox | null
  selectedIndex: number
  totalRows: number
  onUpdateDraft: (rowId: string, field: keyof RowDraft, value: string) => void
}

const TEXT_FIELDS: Array<{ field: keyof Omit<RowDraft, 'status'>; label: string; placeholder?: string }> = [
  { field: 'banderInitials', label: "Bander's Initials", placeholder: 'e.g. HD' },
  { field: 'code', label: 'Code', placeholder: 'e.g. N or R' },
  { field: 'bandNumber', label: 'Band Number', placeholder: 'e.g. 1231-45678' },
  { field: 'speciesCode', label: 'Species Alpha', placeholder: 'e.g. SOSP' },
  { field: 'age', label: 'Age', placeholder: 'e.g. HY' },
  { field: 'howAged', label: 'How Aged', placeholder: 'e.g. CP' },
  { field: 'wrpCode', label: 'WRP Code', placeholder: 'e.g. DPAM' },
  { field: 'sex', label: 'Sex', placeholder: 'e.g. M' },
]

/** Edits the structured draft data attached to the currently selected row. */
export default function RowDraftEditor({
  selectedRow,
  selectedIndex,
  totalRows,
  onUpdateDraft,
}: Props) {
  const handleChange = (field: keyof RowDraft) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!selectedRow) return
    onUpdateDraft(selectedRow.id, field, event.target.value)
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
          </div>
        )}
      </div>

      {selectedRow ? (
        <div className="editor-grid">
          {TEXT_FIELDS.map(({ field, label, placeholder }) => (
            <label key={field} className="editor-field">
              <span>{label}</span>
              <input
                type="text"
                value={selectedRow.draft[field]}
                placeholder={placeholder}
                onChange={handleChange(field)}
              />
            </label>
          ))}

          <label className="editor-field">
            <span>Review Status</span>
            <select value={selectedRow.draft.status} onChange={handleChange('status')}>
              <option value="unreviewed">Unreviewed</option>
              <option value="in-progress">In Progress</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </label>
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
