import { useState, useEffect, useRef } from 'react'
import type { BirdRecord, Session, Location, Band, Person, Bander } from '@birdnerd/shared'
import { getSessions, getRecordsBySession, getLocations, getBands, getPeople, getBanders } from '../db'
import { exportIBP, exportBBL, exportBBLRecap } from '../utils/agencyExport'
import { parseMasterSheet, buildImportPlan, rejectsToCsv, type ImportPlan } from '../utils/masterSheetImport'
import { applyImportPlan, type ImportSummary } from '../utils/applyMasterImport'
import PageHeader from '../components/PageHeader'
import BirdRecordForm from './BirdRecordForm'
import { useWorkspaceAccess } from '../components/WorkspaceAccessGate'
import { getFieldCollaboration } from '../sync/fieldCollaboration'
import { createWorkspaceEventBundle, downloadWorkspaceEventBundle, parseWorkspaceEventBundle } from '../utils/eventBundle'

interface Props {
  onHome: () => void
}

type AgencyFormat = 'ibp' | 'bbl' | 'bbl-recap'

export default function ExportPage({ onHome }: Props) {
  const access = useWorkspaceAccess()
  const { store, sync } = getFieldCollaboration()
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
  const [viewRecord, setViewRecord] = useState<BirdRecord | null>(null)
  const eventBundleFileRef = useRef<HTMLInputElement>(null)
  const masterFileRef = useRef<HTMLInputElement>(null)
  const [importPlan, setImportPlan] = useState<ImportPlan | null>(null)
  const [importPreview, setImportPreview] = useState<ImportSummary | null>(null)
  const [importResult, setImportResult] = useState<ImportSummary | null>(null)
  const [importBusy, setImportBusy] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

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
    const recs: BirdRecord[] = []
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
    const bundle = await createWorkspaceEventBundle(access.workspace_id, await store.exportWorkspaceEvents(access.workspace_id))
    downloadWorkspaceEventBundle(bundle)
    setImportStatus(`Exported ${bundle.events.length} immutable Workspace Events.`)
  }

  async function handleImportBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    try {
      const text = await file.text()
      const bundle = await parseWorkspaceEventBundle(text)
      if (bundle.manifest.workspace_id !== access.workspace_id) throw new Error('This Bundle belongs to another Workspace or you no longer have active access to it.')
      const pending = (await store.diagnostics(access.workspace_id)).queue.filter(item => item.status === 'pending').length
      const ok = confirm(`Restore ${bundle.events.length} immutable Events for ${access.workspace_name}?\n\n${pending} unsynced local Event${pending === 1 ? '' : 's'} will be protected and returned to the outbound queue. The local replica will be replaced and rebuilt, then normal authenticated sync will catch up.`)
      if (!ok) return

      const result = await store.restoreWorkspace(access.workspace_id, bundle.events)
      void sync?.synchronize()
      setImportStatus(`Restored ${bundle.events.length} Events and protected ${result.protected_pending} unsynced local Event${result.protected_pending === 1 ? '' : 's'}. Sync catch-up started.`)
    } catch (cause) {
      setImportStatus(cause instanceof Error ? cause.message : 'Failed to validate the Workspace Event Bundle.')
    }
  }

  function downloadCsvText(filename: string, text: string) {
    const blob = new Blob([text], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleMasterFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImportError(null)
    setImportResult(null)
    setImportPlan(null)
    setImportPreview(null)
    try {
      const text = await file.text()
      const plan = buildImportPlan(parseMasterSheet(text))
      if (plan.sessions.length === 0 && plan.bands.length === 0 && plan.records.length === 0 && plan.rejects.length === 0) {
        setImportError('No rows found. Is this the master banding CSV?')
        return
      }
      const preview = await applyImportPlan(plan, { dryRun: true })
      setImportPlan(plan)
      setImportPreview(preview)
    } catch {
      setImportError('Failed to read or parse the CSV file.')
    }
  }

  async function handleConfirmImport() {
    if (!importPlan) return
    setImportBusy(true)
    try {
      const result = await applyImportPlan(importPlan)
      setImportResult(result)
      setImportPreview(null)
      await loadData()
    } catch {
      setImportError('Import failed while writing to the database.')
    } finally {
      setImportBusy(false)
    }
  }

  function cancelImport() {
    setImportPlan(null)
    setImportPreview(null)
  }

  function warningsToCsv(summary: ImportSummary): string {
    const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
    const lines = ['row,field,message']
    for (const w of summary.warnings) lines.push([String(w.row), w.field, w.message].map(esc).join(','))
    return lines.join('\n')
  }

  const today = new Date().toISOString().slice(0, 10)

  // Count selected records for export button label
  const selectedRecordCount = agencyScope.has('all')
    ? totalRecords
    : Array.from(agencyScope).reduce((n, sid) => n + (allRecords.get(sid)?.length ?? 0), 0)

  if (viewRecord) {
    const recSession = sessions.find(s => s.id === viewRecord.sessionId)
    if (recSession) {
      return (
        <BirdRecordForm
          session={recSession}
          record={viewRecord}
          recordSequence={0}
          readOnly
          onSaved={() => {}}
          onCancel={() => setViewRecord(null)}
          onHome={onHome}
        />
      )
    }
  }

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

          {/* Browse Records section */}
          {totalRecords > 0 && (
            <>
              <div style={styles.divider} />
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Browse Records</h3>
                <p style={styles.desc}>View any banding record (read-only), grouped by session.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {sessions.filter(s => (allRecords.get(s.id) ?? []).length > 0).map(s => (
                    <div key={s.id}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', margin: '0.25rem 0' }}>
                        {locationCode(s.locationId)} · {s.date}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {(allRecords.get(s.id) ?? []).map(r => (
                          <button key={r.id} onClick={() => setViewRecord(r)} style={styles.recordBtn}>
                            <span style={{ fontWeight: 600 }}>{r.speciesCode ?? '—'}</span>
                            {r.bandNumber && <span style={{ color: '#555', fontSize: '0.8rem' }}>{r.bandNumber}</span>}
                            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#888' }}>
                              {[r.wrp, r.sex].filter(Boolean).join(' · ')}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Import Master Sheet section */}
          <div style={styles.divider} />
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Import Master Sheet (CSV)</h3>
            <p style={styles.desc}>
              Upload the master banding CSV. Sessions are created per station + date, bands and records are
              loaded, and anything already in the app is skipped (never overwritten).
            </p>

            <button onClick={() => masterFileRef.current?.click()} style={styles.secondaryBtn}>
              ↑ Choose Master CSV…
            </button>
            <input
              ref={masterFileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleMasterFile}
              style={{ display: 'none' }}
            />

            {importError && <p style={styles.importError}>{importError}</p>}

            {importPreview && !importResult && (
              <div style={styles.previewPanel}>
                <div style={{ fontWeight: 600, marginBottom: '0.4rem' }}>Preview — nothing saved yet</div>
                <ul style={styles.summaryList}>
                  <li>{importPreview.sessionsCreated} new session{importPreview.sessionsCreated !== 1 ? 's' : ''} ({importPreview.sessionsSkipped} already exist)</li>
                  <li>{importPreview.bandsCreated} new band{importPreview.bandsCreated !== 1 ? 's' : ''} ({importPreview.bandsSkipped} already exist)</li>
                  <li>{importPreview.recordsCreated} new record{importPreview.recordsCreated !== 1 ? 's' : ''} ({importPreview.recordsSkipped} already exist)</li>
                  {importPreview.locationsCreated.length > 0 && (
                    <li>New station{importPreview.locationsCreated.length !== 1 ? 's' : ''}: {importPreview.locationsCreated.join(', ')} (stub location created)</li>
                  )}
                  {importPreview.peopleCreated.length > 0 && (
                    <li>{importPreview.peopleCreated.length} new {importPreview.peopleCreated.length !== 1 ? 'people' : 'person'} from bander initials: {importPreview.peopleCreated.join(', ')} (placeholder names)</li>
                  )}
                  {importPreview.warnings.length > 0 && <li>{importPreview.warnings.length} warning{importPreview.warnings.length !== 1 ? 's' : ''}</li>}
                  {importPreview.rejectCount > 0 && <li style={{ color: '#a33' }}>{importPreview.rejectCount} row{importPreview.rejectCount !== 1 ? 's' : ''} cannot be imported (rejected)</li>}
                </ul>
                <div style={styles.buttonStack}>
                  <button onClick={handleConfirmImport} disabled={importBusy} style={styles.primaryBtn}>
                    {importBusy ? 'Importing…' : `Confirm import of ${importPreview.recordsCreated} record${importPreview.recordsCreated !== 1 ? 's' : ''}`}
                  </button>
                  <button onClick={cancelImport} disabled={importBusy} style={styles.secondaryBtn}>Cancel</button>
                </div>
              </div>
            )}

            {importResult && (
              <div style={styles.previewPanel}>
                <div style={{ fontWeight: 600, marginBottom: '0.4rem', color: '#155724' }}>Import complete</div>
                <ul style={styles.summaryList}>
                  <li>{importResult.sessionsCreated} sessions, {importResult.bandsCreated} bands, {importResult.recordsCreated} records created</li>
                  <li>{importResult.sessionsSkipped + importResult.bandsSkipped + importResult.recordsSkipped} items skipped (already present)</li>
                  {importResult.locationsCreated.length > 0 && <li>Stub location{importResult.locationsCreated.length !== 1 ? 's' : ''} created: {importResult.locationsCreated.join(', ')} — fill in details under Locations</li>}
                  {importResult.peopleCreated.length > 0 && <li>{importResult.peopleCreated.length} new {importResult.peopleCreated.length !== 1 ? 'people' : 'person'} created from bander initials: {importResult.peopleCreated.join(', ')} — set their names under People</li>}
                </ul>
                {(importResult.warnings.length > 0 || importResult.rejectCount > 0) && (
                  <div style={styles.buttonStack}>
                    {importResult.rejectCount > 0 && importPlan && (
                      <button onClick={() => downloadCsvText(`birdnerd-import-rejects_${today}.csv`, rejectsToCsv(importPlan.headers, importPlan.rejects))} style={styles.secondaryBtn}>
                        ↓ Download {importResult.rejectCount} rejected row{importResult.rejectCount !== 1 ? 's' : ''} (CSV)
                      </button>
                    )}
                    {importResult.warnings.length > 0 && (
                      <button onClick={() => downloadCsvText(`birdnerd-import-warnings_${today}.csv`, warningsToCsv(importResult))} style={styles.secondaryBtn}>
                        ↓ Download {importResult.warnings.length} warning{importResult.warnings.length !== 1 ? 's' : ''} (CSV)
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Workspace Event Bundle section */}
          <div style={styles.divider} />

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Workspace Event Bundle</h3>
            <p style={styles.desc}>
              Export the immutable Workspace Event Log or perform a recovery-only restore. Restore validates the entire Bundle and Workspace before changing IndexedDB, protects unsynced Events, rebuilds projections, and catches up through authenticated sync.
            </p>

            <div style={styles.buttonStack}>
              <button onClick={handleExportBackup} style={styles.primaryBtn}>
                ↓ Export Event Bundle
              </button>
              <button onClick={() => eventBundleFileRef.current?.click()} style={styles.secondaryBtn}>
                ↑ Restore Event Bundle
              </button>
              <input
                ref={eventBundleFileRef}
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                style={{ display: 'none' }}
              />
            </div>

            <p style={styles.warning}>
              Recovery replaces and rebuilds this Workspace replica. History merge/adoption and photos are not included.
            </p>

            {importStatus && (
              <p style={styles.importStatus}>{importStatus}</p>
            )}
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
  importError: {
    margin: 0,
    padding: '0.5rem 0.75rem',
    background: '#f8d7da',
    borderRadius: '6px',
    fontSize: '0.85rem',
    color: '#721c24',
  },
  previewPanel: {
    padding: '0.75rem',
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    fontSize: '0.85rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  summaryList: {
    margin: 0,
    paddingLeft: '1.1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
    lineHeight: 1.4,
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
  recordBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: 6,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    fontSize: '0.9rem',
  },
}
