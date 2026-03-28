import { useState, useEffect, useRef } from 'react'
import type { BirdRecord, Session, Location, Band, Person, Bander } from '../types'
import { getSessions, getRecordsBySession, getLocations, getBands, getPeople, getBanders } from '../db'
import { exportDataBundle, downloadBundle, validateBundle, importDataBundle } from '../utils/dataBundle'
import { exportIBP, exportBBL, exportBBLRecap } from '../utils/agencyExport'
import type { DataBundle } from '../data/bundle-schema'
import PageHeader from '../components/PageHeader'

interface Props {
  onHome: () => void
}

type AgencyFormat = 'ibp' | 'bbl' | 'bbl-recap'

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
  const [agencyScope, setAgencyScope] = useState<Set<string>>(new Set(['all']))
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

  function toggleScope(sessionId: string) {
    setAgencyScope(prev => {
      const next = new Set(prev)
      if (sessionId === 'all') {
        // Toggle all: if all is selected, deselect; otherwise select all
        if (next.has('all')) {
          return new Set()
        }
        const all = new Set(['all'])
        sessions.forEach(s => all.add(s.id))
        return all
      }
      // Toggle individual session
      next.delete('all')
      if (next.has(sessionId)) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      // If all sessions are now selected, also check "all"
      if (sessions.every(s => next.has(s.id))) {
        next.add('all')
      }
      return next
    })
  }

  function handleAgencyExport() {
    let recs: BirdRecord[] = []
    if (agencyScope.has('all')) {
      for (const s of sessions) {
        const sessionRecs = allRecords.get(s.id)
        if (sessionRecs) recs.push(...sessionRecs)
      }
    } else {
      for (const sid of agencyScope) {
        const sessionRecs = allRecords.get(sid)
        if (sessionRecs) recs.push(...sessionRecs)
      }
    }

    if (recs.length === 0) {
      alert('No records to export.')
      return
    }

    const ctx = { sessions, locations, bands, people, banders }

    if (agencyFormat === 'ibp') {
      exportIBP(recs, ctx)
    } else if (agencyFormat === 'bbl') {
      exportBBL(recs, ctx)
    } else if (agencyFormat === 'bbl-recap') {
      exportBBLRecap(recs, ctx)
    }
  }

  async function handleExportBackup() {
    const bundle = await exportDataBundle()
    downloadBundle(bundle)
  }

  async function handleImportBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
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
      const snlCount = bundle.sessionNetLogs?.length ?? 0
      const bandCount = bundle.bands?.length ?? 0
      const photoCount = bundle.photos?.length ?? 0
      const count = bundle.locations.length + bundle.nets.length + bundle.people.length +
        bundle.banders.length + bundle.sessions.length + sblCount + snlCount +
        bandCount + bundle.records.length + photoCount

      const ok = confirm(
        `This will replace ALL existing data with the backup contents:\n\n` +
        `${bundle.locations.length} locations, ${bundle.nets.length} nets\n` +
        `${bundle.people.length} people, ${bundle.banders.length} banders\n` +
        `${bundle.sessions.length} sessions, ${bundle.records.length} records\n` +
        `${bandCount} bands, ${photoCount} photos\n` +
        `(${count} total items)\n\n` +
        `This cannot be undone. Continue?`
      )
      if (!ok) return

      await importDataBundle(bundle)
      setImportStatus(`Imported ${count} items successfully.`)
      await loadData()
    } catch {
      setImportStatus('Failed to read file. Make sure it is a valid JSON backup.')
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

  // Count selected records for export button label
  const selectedRecordCount = agencyScope.has('all')
    ? totalRecords
    : Array.from(agencyScope).reduce((n, sid) => n + (allRecords.get(sid)?.length ?? 0), 0)

  return (
    <div style={styles.page}>
      <PageHeader title="Data Manager" onHome={onHome} />

      {loading ? (
        <p style={styles.loading}>Loading…</p>
      ) : (
        <>
          <div style={styles.summary}>
            <span>{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
            <span>{totalRecords} record{totalRecords !== 1 ? 's' : ''}</span>
          </div>

          {/* Agency Export section */}
          {totalRecords > 0 && (
            <>
              <div style={styles.divider} />
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Agency Export</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio" name="agencyFormat" value="ibp"
                      checked={agencyFormat === 'ibp'}
                      onChange={() => setAgencyFormat('ibp')}
                    />
                    IBP (MAPS master list)
                  </label>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio" name="agencyFormat" value="bbl"
                      checked={agencyFormat === 'bbl'}
                      onChange={() => setAgencyFormat('bbl')}
                    />
                    BBL Upload (new bandings)
                  </label>
                  <label style={styles.radioLabel}>
                    <input
                      type="radio" name="agencyFormat" value="bbl-recap"
                      checked={agencyFormat === 'bbl-recap'}
                      onChange={() => setAgencyFormat('bbl-recap')}
                    />
                    BBL Recapture Upload (R Upload)
                  </label>
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Sessions</label>
                  <div style={styles.scopeList}>
                    <label style={styles.checkLabel}>
                      <input
                        type="checkbox"
                        checked={agencyScope.has('all')}
                        onChange={() => toggleScope('all')}
                      />
                      All Sessions
                    </label>
                    {sessions.map(s => {
                      const recCount = (allRecords.get(s.id) ?? []).length
                      return (
                        <label key={s.id} style={styles.checkLabel}>
                          <input
                            type="checkbox"
                            checked={agencyScope.has(s.id) || agencyScope.has('all')}
                            onChange={() => toggleScope(s.id)}
                          />
                          {locationCode(s.locationId)} · {s.date} ({recCount} rec{recCount !== 1 ? 's' : ''})
                        </label>
                      )
                    })}
                  </div>
                </div>

                <button onClick={handleAgencyExport} style={styles.primaryBtn}>
                  ↓ Export {selectedRecordCount} record{selectedRecordCount !== 1 ? 's' : ''}
                </button>
              </div>
            </>
          )}

          {/* Data Backup section */}
          <div style={styles.divider} />

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Data Backup</h3>
            <p style={styles.desc}>
              Full backup of all managed data: locations, nets, people, banders, sessions, and banding records.
            </p>

            <div style={styles.buttonStack}>
              <button onClick={handleExportBackup} style={styles.primaryBtn}>
                ↓ Export Backup (JSON)
              </button>
              <button onClick={() => fileInputRef.current?.click()} style={styles.secondaryBtn}>
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

            <p style={styles.warning}>
              Import replaces all existing data. Export a backup first.
            </p>

            {importStatus && (
              <p style={styles.importStatus}>{importStatus}</p>
            )}

            {/* TODO: Remove this button once Hallie has real data */}
            <div style={styles.divider} />
            <button onClick={handleLoadExample} style={styles.secondaryBtn}>
              Load Example Data
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
  summary: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.6rem 1rem',
    background: '#fff',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  divider: {
    width: '100%',
    height: '1px',
    background: '#ccc',
    margin: '0.5rem 0',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 600,
  },
  desc: {
    margin: 0,
    fontSize: '0.85rem',
    opacity: 0.7,
    lineHeight: 1.4,
  },
  primaryBtn: {
    padding: '0.7rem',
    background: '#2d6a4f',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  secondaryBtn: {
    padding: '0.7rem',
    background: '#fff',
    color: '#2d6a4f',
    border: '2px solid #2d6a4f',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  buttonStack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  warning: {
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
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  scopeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    marginTop: '0.25rem',
    padding: '0.5rem 0.75rem',
    background: '#fff',
    borderRadius: 6,
    border: '1px solid #e0e0e0',
  },
}
