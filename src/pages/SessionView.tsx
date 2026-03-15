import { useState, useEffect } from 'react'
import type { BirdRecord, Session } from '../types'
import { getRecordsBySession, deleteRecord } from '../db'
import BirdRecordForm from './BirdRecordForm'
import { exportSessionCSV } from '../utils/exportCsv'

interface Props {
  session: Session
  onBack: () => void
}

type View = { mode: 'list' } | { mode: 'form'; record?: BirdRecord }

export default function SessionView({ session, onBack }: Props) {
  const [records, setRecords] = useState<BirdRecord[]>([])
  const [view, setView] = useState<View>({ mode: 'list' })

  async function loadRecords() {
    const r = await getRecordsBySession(session.id)
    setRecords(r.sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
  }

  useEffect(() => {
    loadRecords()
  }, [session.id])

  if (view.mode === 'form') {
    return (
      <BirdRecordForm
        session={session}
        record={view.record}
        onSaved={() => { loadRecords(); setView({ mode: 'list' }) }}
        onCancel={() => setView({ mode: 'list' })}
      />
    )
  }

  return (
    <div style={{ padding: '1rem', maxWidth: 500, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <button onClick={onBack} style={backBtnStyle}>← Sessions</button>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{session.station}</h2>
      </div>
      <p style={{ color: '#555', fontSize: '0.85rem', marginTop: 0, marginBottom: '1rem' }}>{session.date}</p>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => setView({ mode: 'form' })} style={btnStyle}>
          + New Bird Record
        </button>
        {records.length > 0 && (
          <button onClick={() => exportSessionCSV(session, records)} style={secondaryBtnStyle}>
            ↓ Export CSV
          </button>
        )}
      </div>

      <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
        {records.map(r => (
          <li key={r.id} style={recordRowStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{r.speciesCode ?? '—'}</strong>
                {r.bandNumber && <span style={{ color: '#555', marginLeft: '0.5rem', fontSize: '0.85rem' }}>{r.bandNumber}</span>}
                <div style={{ fontSize: '0.8rem', color: '#777', marginTop: '0.2rem' }}>
                  {[r.age, r.sex, r.captureTime, r.net ? `Net ${r.net}` : null].filter(Boolean).join(' · ')}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button onClick={() => setView({ mode: 'form', record: r })} style={smallBtnStyle('#2d6a4f')}>Edit</button>
                <button
                  onClick={async () => {
                    if (confirm('Delete this record?')) {
                      await deleteRecord(r.id)
                      loadRecords()
                    }
                  }}
                  style={smallBtnStyle('#c0392b')}
                >
                  Del
                </button>
              </div>
            </div>
          </li>
        ))}
        {records.length === 0 && (
          <li style={{ color: '#888', textAlign: 'center', marginTop: '2rem' }}>
            No records yet. Add the first bird.
          </li>
        )}
      </ul>
    </div>
  )
}

const backBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#2d6a4f',
  fontSize: '1rem',
  cursor: 'pointer',
  padding: '0.25rem 0',
}

const btnStyle: React.CSSProperties = {
  background: '#2d6a4f',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '0.6rem 1.2rem',
  fontSize: '1rem',
  cursor: 'pointer',
}

const smallBtnStyle = (bg: string): React.CSSProperties => ({
  background: bg,
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  padding: '0.25rem 0.6rem',
  fontSize: '0.8rem',
  cursor: 'pointer',
})

const secondaryBtnStyle: React.CSSProperties = {
  background: '#fff',
  color: '#2d6a4f',
  border: '1.5px solid #2d6a4f',
  borderRadius: 6,
  padding: '0.6rem 1.2rem',
  fontSize: '1rem',
  cursor: 'pointer',
}

const recordRowStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: '0.75rem 1rem',
  marginBottom: '0.5rem',
}
