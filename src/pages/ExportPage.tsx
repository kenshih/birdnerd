import { useState, useEffect } from 'react'
import type { BirdRecord, Session } from '../types'
import { getSessions, getRecordsBySession } from '../db'
import { exportSessionCSV } from '../utils/exportCsv'
import PageHeader from '../components/PageHeader'

interface Props {
  onHome: () => void
}

export default function ExportPage({ onHome }: Props) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [allRecords, setAllRecords] = useState<Map<string, BirdRecord[]>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const sess = await getSessions()
      sess.sort((a, b) => b.date.localeCompare(a.date))
      setSessions(sess)

      const map = new Map<string, BirdRecord[]>()
      for (const s of sess) {
        const recs = await getRecordsBySession(s.id)
        if (recs.length > 0) map.set(s.id, recs)
      }
      setAllRecords(map)
      setLoading(false)
    })()
  }, [])

  const totalRecords = Array.from(allRecords.values()).reduce((n, r) => n + r.length, 0)

  function exportAll() {
    const allRecs: BirdRecord[] = []
    for (const s of sessions) {
      const recs = allRecords.get(s.id)
      if (recs) allRecs.push(...recs)
    }
    if (allRecs.length === 0) { alert('No records to export.'); return }
    const combined: Session = { id: 'all', station: 'all', date: new Date().toISOString().slice(0, 10), createdAt: '' }
    exportSessionCSV(combined, allRecs)
  }

  return (
    <div style={styles.page}>
      <PageHeader title="View Data / Export" onHome={onHome} />

      {loading ? (
        <p style={styles.loading}>Loading…</p>
      ) : sessions.length === 0 ? (
        <p style={styles.empty}>No sessions yet.</p>
      ) : (
        <>
          <div style={styles.summary}>
            <span>{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
            <span>{totalRecords} record{totalRecords !== 1 ? 's' : ''}</span>
          </div>

          {totalRecords > 0 && (
            <button onClick={exportAll} style={styles.exportAllBtn}>
              ↓ Export All Records (CSV)
            </button>
          )}

          <div style={styles.list}>
            {sessions.map(s => {
              const recs = allRecords.get(s.id) ?? []
              return (
                <div key={s.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <strong>{s.station}</strong>
                    <span style={styles.date}>{s.date}</span>
                  </div>
                  <div style={styles.cardBody}>
                    <span>{recs.length} record{recs.length !== 1 ? 's' : ''}</span>
                    {recs.length > 0 && (
                      <button onClick={() => exportSessionCSV(s, recs)} style={styles.exportBtn}>
                        ↓ CSV
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    padding: '1rem 1.5rem',
    gap: '1rem',
    background: '#f5f5f5',
    color: '#1b4332',
  },
  loading: { textAlign: 'center' as const, opacity: 0.6 },
  empty: { textAlign: 'center' as const, opacity: 0.6, marginTop: '2rem' },
  summary: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.6rem 1rem',
    background: '#fff',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  exportAllBtn: {
    padding: '0.7rem',
    background: '#2d6a4f',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  card: {
    background: '#fff',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.4rem',
  },
  date: {
    fontSize: '0.85rem',
    opacity: 0.6,
  },
  cardBody: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.85rem',
    opacity: 0.7,
  },
  exportBtn: {
    padding: '0.3rem 0.6rem',
    background: '#2d6a4f',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
}
