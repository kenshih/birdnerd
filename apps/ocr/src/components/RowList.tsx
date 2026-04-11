import type { RowBox } from '../types'

/** Shows the ordered row list and lets the user select or delete row boxes. */
interface Props {
  rowBoxes: RowBox[]
  selectedRowId: string | null
  onSelectRow: (rowId: string) => void
  onDeleteSelectedRow: () => void
}

export default function RowList({
  rowBoxes,
  selectedRowId,
  onSelectRow,
  onDeleteSelectedRow,
}: Props) {
  return (
    <section className="card side-panel">
      <h2>Rows</h2>
      <p className="panel-copy">
        Draw row boxes directly on the sheet. Select a row to inspect its crop and step through the sheet.
      </p>

      <div className="row-actions">
        <button
          className="button secondary"
          type="button"
          onClick={onDeleteSelectedRow}
          disabled={!selectedRowId}
        >
          Delete selected row
        </button>
      </div>

      {rowBoxes.length > 0 ? (
        <ol className="row-list">
          {rowBoxes.map((rowBox, index) => (
            <li key={rowBox.id}>
              <button
                type="button"
                className={`row-list-item${rowBox.id === selectedRowId ? ' is-selected' : ''}`}
                onClick={() => onSelectRow(rowBox.id)}
              >
                <span>Row {index + 1}</span>
                <span className="row-list-meta">
                  {Math.round(rowBox.rect.width * 100)}% × {Math.round(rowBox.rect.height * 100)}%
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <div className="empty-panel-state">
          <p>No rows yet.</p>
          <span>Click and drag on the sheet to create the first row box.</span>
        </div>
      )}
    </section>
  )
}
