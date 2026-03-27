import { useState, useEffect, useRef } from 'react'
import type { BirdRecord, Session, Location, Band, Person, Bander } from '../types'
import { getSessions, getRecordsBySession, getLocations, getBands, getPeople, getBanders } from '../db'
import { exportSessionCSV } from '../utils/exportCsv'
import { exportDataBundle, downloadBundle, validateBundle, importDataBundle } from '../utils/dataBundle'
import { exportIBP } from '../utils/agencyExport'
import type { DataBundle } from '../data/bundle-schema'
import PageHeader from '../components/PageHeader'

interface Props {
  onHome: () => void
}

type AgencyFormat = 'ibp'

export default function ExportPage({ onHome }: Props) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [bands, setBands] = useState<Band[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [banders, setBanders] = useState<Bander[]>([])
  const [allRecords, setAllRecords] = useState<Map<string, BirdRecord[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [agencyFormat, setAgencyFormat] = useState<AgencyFormat>('ibp')
  const [agencyScope, setAgencyScope] = useState<string>('all')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function locationCode(locId: string): string {
    return locations.find(l => l.id === locId)?.banderLocationId ?? ''
  }

  async function loadData() {
    const [sess, locs, bnds, ppl, bdrs] = await Promise.all([
      getSessions(), getLocations(), getBands(), getPeople(), getBanders(),
    ])
    sess.sort((a, b) => b.date.localeCompare(a.date))
    setSessions(sess)
    setLocations(locs)
    setBands(bnds)
    setPeople(ppl)
    setBanders(bdrs)

    const map = new Map<string, BirdRecord[]>()
    for (const s of sess) {
      const recs = await getRecordsBySession(s.id)
      if (recs.length > 0) map.set(s.id, recs)
    }
    setAllRecords(map)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const totalRecords = Array.from(allRecords.values()).reduce((n, r) => n + r.length, 0)

  function exportAllCsv() {
    const allRecs: BirdRecord[] = []
    for (const s of sessions) {
      const recs = allRecords.get(s.id)
      if (recs) allRecs.push(...recs)
    }
    if (allRecs.length === 0) { alert('No records to export.'); return }
    const combined: Session = { id: 'all', locationId: '', date: new Date().toISOString().slice(0, 10), createdAt: '', updatedAt: '' }
    exportSessionCSV(combined, allRecs, 'all')
  }

  async function handleExportBackup() {
    const bundle = await exportDataBundle()
    downloadBundle(bundle)
  }

  async function handleImportBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset file input so same file can be re-selected
    e.target.value = ''

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const error = validateBundle(data)
      if (error) {
        setImportStatus(error)
        return
      }

      const bundle = data as DataBundle
      const sblCount = bundle.sessionBanderLogs?.length ?? 0
      const count = bundle.locations.length + bundle.nets.length + bundle.people.length +
        bundle.banders.length + bundle.sessions.length + sblCount + bundle.records.length

      const ok = confirm(
        `This will replace ALL existing data with the backup contents:\n\n` +
        `${bundle.locations.length} locations, ${bundle.nets.length} nets\n` +
        `${bundle.people.length} people, ${bundle.banders.length} banders\n` +
        `${bundle.sessions.length} sessions, ${bundle.records.length} records\n` +
        `(${count} total items)\n\n` +
        `This cannot be undone. Continue?`
      )
      if (!ok) return

      await importDataBundle(bundle)
      setImportStatus(`Imported ${count} items successfully.`)
      // Reload page data to reflect changes
      await loadData()
    } catch {
      setImportStatus('Failed to read file. Make sure it is a valid JSON backup.')
    }
  }

  function handleAgencyExport() {
    // Gather records based on scope
    let recs: BirdRecord[] = []
    if (agencyScope === 'all') {
      for (const s of sessions) {
        const sessionRecs = allRecords.get(s.id)
        if (sessionRecs) recs.push(...sessionRecs)
      }
    } else {
      const sessionRecs = allRecords.get(agencyScope)
      if (sessionRecs) recs.push(...sessionRecs)
    }

    if (recs.length === 0) {
      alert('No records to export.')
      return
    }

    const ctx = { sessions, locations, bands, people, banders }

    if (agencyFormat === 'ibp') {
      exportIBP(recs, ctx)
    }
  }

  async function handleLoadExample() {
    const ok = confirm(
      'This will replace ALL existing data with example data (seed + sample session).\n\nContinue?'
    )
    if (!ok) return
    try {
      const resp = await fetch(import.meta.env.BASE_URL + 'data/example-data.json')
      if (!resp.ok) { setImportStatus('Could not load example data file.'); return }
      const data = await resp.json()
      const error = validateBundle(data)
      if (error) { setImportStatus(error); return }
      await importDataBundle(data)
      setImportStatus('Example data loaded successfully.')
      await loadData()
    } catch {
      setImportStatus('Failed to load example data.')
    }
  }

  return (
    <div style={styles.page}>
      <PageHeader title="Data Manager" onHome={onHome} />

      {loading ? (
        <p style={styles.loading}>Loading…</p>
      ) : (
        <>
          {sessions.length === 0 ? (
            <p style={styles.empty}>No sessions yet.</p>
          ) : (
            <>
              <div style={styles.summary}>
                <span>{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
                <span>{totalRecords} record{totalRecords !== 1 ? 's' : ''}</span>
              </div>

              {totalRecords > 0 && (
                <button onClick={exportAllCsv} style={styles.exportAllBtn}>
                  ↓ Export All Records (CSV)
                </button>
              )}

              <div style={styles.list}>
                {sessions.map(s => {
                  const recs = allRecords.get(s.id) ?? []
                  return (
                    <div key={s.id} style={styles.card}>
                      <div style={styles.cardHeader}>
                        <strong>{locationCode(s.locationId)}</strong>
                        <span style={styles.date}>{s.date}</span>
                      </div>
                      <div style={styles.cardBody}>
                        <span>{recs.length} record{recs.length !== 1 ? 's' : ''}</span>
                        {recs.length > 0 && (
                          <button onClick={() => exportSessionCSV(s, recs, locationCode(s.locationId))} style={styles.exportBtn}>
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

          {/* Agency Export section */}
          {totalRecords > 0 && (
            <>
              <div style={styles.divider} />
              <div style={styles.backupSection}>
                <h3 style={styles.backupTitle}>Agency Export</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio" name="agencyFormat" value="ibp"
                      checked={agencyFormat === 'ibp'}
                      onChange={() => setAgencyFormat('ibp')}
                    />
                    IBP (MAPS master list)
                  </label>
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Scope</label>
                  <select
                    value={agencyScope}
                    onChange={e => setAgencyScope(e.target.value)}
                    style={styles.scopeSelect}
                  >
                    <option value="all">All Sessions</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>
                        {locationCode(s.locationId)} · {s.date} ({(allRecords.get(s.id) ?? []).length} recs)
                      </option>
                    ))}
                  </select>
                </div>

                <button onClick={handleAgencyExport} style={styles.exportAllBtn}>
                  ↓ Export
                </button>
              </div>
            </>
          )}

          {/* Data Backup section */}
          <div style={styles.divider} />

          <div style={styles.backupSection}>
            <h3 style={styles.backupTitle}>Data Backup</h3>
            <p style={styles.backupDesc}>
              Full backup of all managed data: locations, nets, people, banders, sessions, and banding records.
            </p>

            <div style={styles.backupButtons}>
              <button onClick={handleExportBackup} style={styles.exportAllBtn}>
                ↓ Export Backup (JSON)
              </button>
              <button onClick={() => fileInputRef.current?.click()} style={styles.importBtn}>
                ↑ Import Backup (JSON)
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                style={{ display: 'none' }}
              />
            </div>

            <p style={styles.backupWarning}>
              Import replaces all existing data. Export a backup first.
            </p>

            {importStatus && (
              <p style={styles.importStatus}>{importStatus}</p>
            )}

            {/* TODO: Remove this button once Hallie has real data */}
            <div style={styles.divider} />
            <button onClick={handleLoadExample} style={styles.exampleBtn}>
              Load Example Data (for Hallie)
            </button>
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
  divider: {
    width: '100%',
    height: '1px',
    background: '#ccc',
    margin: '0.5rem 0',
  },
  backupSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  backupTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 600,
  },
  backupDesc: {
    margin: 0,
    fontSize: '0.85rem',
    opacity: 0.7,
    lineHeight: 1.4,
  },
  backupButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  importBtn: {
    padding: '0.7rem',
    background: '#fff',
    color: '#2d6a4f',
    border: '2px solid #2d6a4f',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  backupWarning: {
    margin: 0,
    fontSize: '0.8rem',
    opacity: 0.6,
    fontStyle: 'italic',
  },
  importStatus: {
    margin: 0,
    padding: '0.5rem 0.75rem',
    background: '#d4edda',
    borderRadius: '6px',
    fontSize: '0.85rem',
    color: '#155724',
  },
  exampleBtn: {
    padding: '0.7rem',
    background: '#e9ecef',
    color: '#495057',
    border: '1px dashed #adb5bd',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  scopeSelect: {
    width: '100%',
    padding: '0.45rem 0.5rem',
    fontSize: '0.9rem',
    borderRadius: 6,
    border: '1px solid #ccc',
    marginTop: '0.25rem',
  },
}
