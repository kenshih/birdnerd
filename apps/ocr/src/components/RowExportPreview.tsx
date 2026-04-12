import type { RowExportRecord } from '../utils/exportRows'

interface Props {
  records: RowExportRecord[]
  onExportCsv: () => void
}

const PREVIEW_COLUMNS: Array<{ key: keyof RowExportRecord; label: string }> = [
  { key: 'rowNumber', label: 'Row' },
  { key: 'reviewStatus', label: 'Status' },
  { key: 'banderInitials', label: 'Bander' },
  { key: 'code', label: 'Code' },
  { key: 'bandNumber', label: 'Band Number' },
  { key: 'speciesCode', label: 'Species' },
  { key: 'age', label: 'Age' },
  { key: 'howAged', label: 'How Aged' },
  { key: 'wrpCode', label: 'WRP' },
  { key: 'sex', label: 'Sex' },
  { key: 'howSexed', label: 'How Sexed' },
  { key: 'skull', label: 'Skull' },
  { key: 'cloacalProtuberance', label: 'Cl. Prot.' },
  { key: 'broodPatch', label: 'Br. Patch' },
  { key: 'fat', label: 'Fat' },
  { key: 'bodyMolt', label: 'Body Mlt' },
  { key: 'flightFeatherMolt', label: 'FF Molt' },
  { key: 'flightFeatherWear', label: 'FF Wear' },
  { key: 'juvenileBodyPlumage', label: 'Juv Body Pl' },
]

/** Shows the current exportable OCR rows before downloading a CSV. */
export default function RowExportPreview({ records, onExportCsv }: Props) {
  return (
    <section className="card export-card">
      <div className="export-header">
        <div>
          <h2>Export Preview</h2>
          <p className="panel-copy">
            Preview the non-empty OCR rows exactly as they will be exported to CSV.
          </p>
        </div>

        <button
          className="button primary"
          type="button"
          onClick={onExportCsv}
          disabled={records.length === 0}
        >
          Export CSV
        </button>
      </div>

      {records.length > 0 ? (
        <div className="export-table-shell">
          <table className="export-table">
            <thead>
              <tr>
                {PREVIEW_COLUMNS.map(({ key, label }) => (
                  <th key={key} scope="col">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.rowNumber}>
                  {PREVIEW_COLUMNS.map(({ key }) => (
                    <td key={key}>{record[key] || '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-panel-state">
          <p>No exportable rows yet.</p>
          <span>Enter data into at least one row draft to preview and export CSV output.</span>
        </div>
      )}
    </section>
  )
}

