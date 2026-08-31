import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { projectOperationalEvents, type OperationalEntity } from '@birdnerd/banding'
import PageHeader from '../components/PageHeader'
import { useWorkspaceAccess } from '../components/WorkspaceAccessGate'
import { getFieldCollaboration } from '../sync/fieldCollaboration'
import { legacyBandLabel, recordBandReference, unresolvedManagedBandLabel } from '../utils/recordReference'
import {
  downloadProjectionAgencyRows,
  generateProjectionAgencyRows,
  type ProjectionAgencyFormat,
} from '../utils/agencyExport'
import {
  createWorkspaceEventBundle,
  downloadWorkspaceEventBundle,
  parseWorkspaceEventBundle,
} from '../utils/eventBundle'

interface Props {
  onHome: () => void
  onViewRecord: (recordId: string) => void
}

export default function WorkspaceEventBundlePage({ onHome, onViewRecord }: Props) {
  const access = useWorkspaceAccess()
  const { store, sync } = getFieldCollaboration()
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [projection, setProjection] = useState(() => projectOperationalEvents([]))
  const [browseError, setBrowseError] = useState<string | null>(null)
  const [agencyFormat, setAgencyFormat] = useState<ProjectionAgencyFormat>('ibp')
  const [agencyScope, setAgencyScope] = useState<Set<string>>(() => new Set(['all']))

  const refreshRecords = useCallback(async () => {
    const events = await store.snapshot(access.workspace_id)
    setProjection(projectOperationalEvents(events))
    setBrowseError(null)
  }, [access.workspace_id, store])

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        store.activateWorkspace(access.workspace_id)
        if (sync) await sync.synchronize()
        if (mounted) await refreshRecords()
      } catch (cause) {
        if (mounted) setBrowseError(cause instanceof Error ? cause.message : 'Could not load projected Records.')
      }
    })()
    return () => { mounted = false }
  }, [access.workspace_id, refreshRecords, store, sync])

  useEffect(() => {
    if (!sync) return
    return sync.subscribe(() => {
      void refreshRecords().catch(cause => setBrowseError(cause instanceof Error ? cause.message : 'Could not load projected Records.'))
    })
  }, [refreshRecords, sync])

  const entities = [...projection.entities.values()]
  const records = entities.filter(entity => entity.kind === 'banding-record')
  const recordGroups = groupRecordsBySession(records, projection.entities)
  const sessions = entities.filter(entity => entity.kind === 'session')
  const selectedSessionIds = agencyScope.has('all') ? undefined : agencyScope
  const selectedAgencyRows = generateProjectionAgencyRows(projection, agencyFormat, selectedSessionIds)
  const selectedRecordCount = selectedAgencyRows.rows.length

  function toggleAgencyScope(sessionId: string) {
    setAgencyScope(current => {
      if (sessionId === 'all') return current.has('all') ? new Set() : new Set(['all'])
      const next = current.has('all') ? new Set(sessions.map(session => session.id)) : new Set(current)
      if (next.has(sessionId)) next.delete(sessionId)
      else next.add(sessionId)
      return sessions.length > 0 && sessions.every(session => next.has(session.id)) ? new Set(['all']) : next
    })
  }

  function exportAgencyCsv() {
    if (selectedAgencyRows.rows.length === 0) {
      setStatus('No active Records match the selected Sessions and agency format.')
      return
    }
    downloadProjectionAgencyRows(agencyFormat, selectedAgencyRows)
    setStatus(`Downloaded ${selectedAgencyRows.rows.length} ${agencyFormatLabel(agencyFormat)} row${selectedAgencyRows.rows.length === 1 ? '' : 's'}.`)
  }

  async function exportBundle() {
    try {
      const events = await store.exportWorkspaceEvents(access.workspace_id)
      const bundle = await createWorkspaceEventBundle(access.workspace_id, events)
      downloadWorkspaceEventBundle(bundle)
      setStatus(`Exported ${bundle.events.length} immutable Workspace Events.`)
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : 'Failed to export the Workspace Event Bundle.')
    }
  }

  async function restoreBundle(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''

    try {
      const bundle = await parseWorkspaceEventBundle(await file.text())
      if (bundle.manifest.workspace_id !== access.workspace_id) {
        throw new Error('This Bundle belongs to another Workspace or you no longer have active access to it.')
      }

      const pending = (await store.diagnostics(access.workspace_id)).queue
        .filter(item => item.status === 'pending').length
      const confirmed = confirm(
        `Restore ${bundle.events.length} immutable Events for ${access.workspace_name}?\n\n`
        + `${pending} unsynced local Event${pending === 1 ? '' : 's'} will be protected and returned to the outbound queue. `
        + 'The local replica will be replaced and rebuilt, then normal authenticated sync will catch up.',
      )
      if (!confirmed) return

      setStatus('Restoring and rebuilding this Workspace replica…')
      const result = await store.restoreWorkspace(access.workspace_id, bundle.events)
      const restored = `Restored ${bundle.events.length} Events and protected ${result.protected_pending} unsynced local Event${result.protected_pending === 1 ? '' : 's'}.`
      await refreshRecords()

      if (!sync) {
        setStatus(`${restored} Sync catch-up will begin when collaboration is connected.`)
        return
      }

      const syncStatus = await sync.synchronize()
      await refreshRecords()
      setStatus(syncStatus.kind === 'offline'
        ? `${restored} Sync catch-up will retry automatically.`
        : syncStatus.kind === 'attention'
          ? `${restored} Sync catch-up completed with ${syncStatus.rejected} Event${syncStatus.rejected === 1 ? '' : 's'} needing attention.`
        : `${restored} Sync catch-up completed.`)
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : 'Failed to validate the Workspace Event Bundle.')
    }
  }

  return (
    <main style={styles.page}>
      <PageHeader title="Data Manager" onHome={onHome} />

      <section style={styles.panel}>
        <p style={styles.description}>
          Export the immutable Workspace Event Log or perform a recovery-only restore. Restore validates the entire Bundle and Workspace before changing this device, protects unsynced Events, rebuilds projections, and catches up through authenticated sync.
        </p>

        <div style={styles.actions}>
          <button type="button" onClick={exportBundle} style={styles.primaryButton}>
            ↓ Export Event Bundle
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} style={styles.secondaryButton}>
            ↑ Restore Event Bundle
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={restoreBundle}
            style={{ display: 'none' }}
          />
        </div>

        <p style={styles.warning}>
          Recovery replaces and rebuilds this Workspace replica. History merge/adoption and photos are not included.
        </p>

        {status && <p role="status" style={styles.status}>{status}</p>}
      </section>

      <section style={styles.panel}>
        <h2 style={styles.heading}>Agency CSV export</h2>
        <p style={styles.description}>Export active projected Records in the established agency layouts. Station agency codes are configured by an Admin in Field Data; a missing code remains blank in the CSV.</p>

        <div style={styles.radioList}>
          <label style={styles.checkLabel}><input type="radio" name="agency-format" checked={agencyFormat === 'ibp'} onChange={() => setAgencyFormat('ibp')} />IBP MAPS Master List</label>
          <label style={styles.checkLabel}><input type="radio" name="agency-format" checked={agencyFormat === 'bbl'} onChange={() => setAgencyFormat('bbl')} />BBL upload (new bandings)</label>
          <label style={styles.checkLabel}><input type="radio" name="agency-format" checked={agencyFormat === 'bbl-recap'} onChange={() => setAgencyFormat('bbl-recap')} />BBL recapture upload</label>
        </div>

        <div style={styles.scopeList}>
          <strong>Sessions</strong>
          <label style={styles.checkLabel}><input type="checkbox" checked={agencyScope.has('all')} onChange={() => toggleAgencyScope('all')} />All Sessions</label>
          {sessions.map(session => {
            const count = records.filter(record => record.active && text(record.fields.session_id) === session.id).length
            return <label key={session.id} style={styles.checkLabel}><input type="checkbox" checked={agencyScope.has('all') || agencyScope.has(session.id)} onChange={() => toggleAgencyScope(session.id)} />{agencySessionLabel(session, projection.entities)} ({count} active Record{count === 1 ? '' : 's'})</label>
          })}
        </div>

        <button type="button" onClick={exportAgencyCsv} disabled={selectedRecordCount === 0} style={styles.primaryButton}>
          ↓ Export {selectedRecordCount} active Record{selectedRecordCount === 1 ? '' : 's'}
        </button>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.heading}>Browse Records</h2>
        <p style={styles.description}>Inspect the current projected Workspace Records. Viewing a Record is read-only and does not change the Event Log.</p>
        {browseError
          ? <p role="status" style={styles.error}>{browseError}</p>
          : recordGroups.length === 0
            ? <p style={styles.empty}>No projected Records yet.</p>
            : recordGroups.map(group => (
              <section key={group.sessionId} style={styles.recordGroup}>
                <h3 style={styles.groupHeading}>{group.label}</h3>
                {group.records.map(record => (
                  <div key={record.id} style={styles.recordRow}>
                    <div>
                      <strong>{recordSummary(record, projection.entities)}</strong>
                      <div style={styles.recordState}>{record.active ? 'Active Record' : 'Inactive Record'}</div>
                    </div>
                    <button type="button" onClick={() => onViewRecord(record.id)} style={styles.secondaryButton}>View</button>
                  </div>
                ))}
              </section>
            ))}
      </section>
    </main>
  )
}

function groupRecordsBySession(records: readonly OperationalEntity[], entities: ReadonlyMap<string, OperationalEntity>) {
  const groups = new Map<string, OperationalEntity[]>()
  for (const record of records) {
    const sessionId = text(record.fields.session_id) || 'unresolved-session'
    const group = groups.get(sessionId) ?? []
    group.push(record)
    groups.set(sessionId, group)
  }
  return [...groups].map(([sessionId, group]) => ({
    sessionId,
    label: sessionLabel(sessionId, entities),
    records: group.sort((a, b) => recordSummary(a, entities).localeCompare(recordSummary(b, entities))),
  })).sort((a, b) => b.label.localeCompare(a.label))
}

function sessionLabel(sessionId: string, entities: ReadonlyMap<string, OperationalEntity>): string {
  const session = entities.get(sessionId)
  if (!session || session.kind !== 'session') return `Unresolved Session — ${sessionId === 'unresolved-session' ? 'not recorded' : sessionId}`
  const date = text(session.fields.session_date) || 'Date not entered'
  return `${date}${session.active ? '' : ' (inactive Session)'}`
}

function agencySessionLabel(session: OperationalEntity, entities: ReadonlyMap<string, OperationalEntity>): string {
  const station = entities.get(text(session.fields.station_id))
  const code = station?.kind === 'station' ? text(station.fields.agency_code) : ''
  const name = station?.kind === 'station' ? text(station.fields.name) : ''
  return [code || name, text(session.fields.session_date) || 'Date not entered'].filter(Boolean).join(' · ')
}

function agencyFormatLabel(format: ProjectionAgencyFormat): string {
  return format === 'ibp' ? 'IBP MAPS Master List' : format === 'bbl' ? 'BBL upload' : 'BBL recapture upload'
}

function recordSummary(record: OperationalEntity, entities: ReadonlyMap<string, OperationalEntity>): string {
  const reference = recordBandReference(record.fields)
  let band = 'Band not entered'
  if (reference.mode === 'unbanded') band = 'Unbanded'
  if (reference.mode === 'foreign') band = reference.bandNumber || 'Foreign Band not entered'
  if (reference.mode === 'legacy') band = legacyBandLabel(reference.bandNumber)
  if (reference.mode === 'managed') {
    const managed = reference.bandId ? entities.get(reference.bandId) : undefined
    band = !managed || managed.kind !== 'band'
      ? unresolvedManagedBandLabel(reference.bandNumber, reference.bandId)
      : `${text(managed.fields.band_number) || managed.id}${managed.active ? '' : ' (inactive Band)'}`
  }
  const capture = text(record.fields.capture_code)
  return [text(record.fields.species_code) || 'Species not entered', band, capture ? `Capture ${capture}` : 'Capture code not entered'].join(' · ')
}

function text(value: unknown): string { return value === undefined || value === null ? '' : String(value) }

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    padding: '1rem 1.5rem',
    background: '#f5f5f5',
    color: '#1b4332',
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    padding: '1rem',
    background: '#fff',
    borderRadius: '8px',
  },
  heading: {
    margin: 0,
    fontSize: '1.1rem',
  },
  description: {
    margin: 0,
    fontSize: '0.9rem',
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  radioList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  scopeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
  },
  primaryButton: {
    minHeight: 44,
    minWidth: 44,
    padding: '0.7rem',
    background: '#2d6a4f',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  secondaryButton: {
    minHeight: 44,
    minWidth: 44,
    padding: '0.7rem',
    background: '#fff',
    color: '#2d6a4f',
    border: '2px solid #2d6a4f',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  warning: {
    margin: 0,
    fontSize: '0.8rem',
    opacity: 0.65,
    fontStyle: 'italic',
  },
  empty: {
    margin: 0,
    color: '#555',
  },
  error: {
    margin: 0,
    padding: '0.5rem 0.75rem',
    background: '#f8d7da',
    borderRadius: '6px',
    fontSize: '0.85rem',
    color: '#721c24',
  },
  recordGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  groupHeading: {
    margin: 0,
    fontSize: '0.9rem',
  },
  recordRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.75rem',
    paddingTop: '0.6rem',
    borderTop: '1px solid #d8f3dc',
  },
  recordState: {
    marginTop: '0.2rem',
    fontSize: '0.8rem',
    color: '#555',
  },
  status: {
    margin: 0,
    padding: '0.5rem 0.75rem',
    background: '#d4edda',
    borderRadius: '6px',
    fontSize: '0.85rem',
    color: '#155724',
  },
}
