import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  changedBandingRecordFields,
  decideAmendBandingRecord,
  decideCreateBandingRecord,
  decideCreateSession,
  projectPilotBanding,
  type PilotBandingRecord,
} from '@birdnerd/banding'
import type { SyncStatus } from '@birdnerd/sync-state'
import PageHeader from '../components/PageHeader'
import { useWorkspaceAccess } from '../components/WorkspaceAccessGate'
import { getFieldCollaboration } from '../sync/fieldCollaboration'

export default function PilotWorkspacePage({ onHome }: { onHome: () => void }) {
  const access = useWorkspaceAccess()
  const { store, sync } = useMemo(getFieldCollaboration, [])
  const [projection, setProjection] = useState(() => projectPilotBanding([]))
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(sync?.getState() ?? { kind: 'offline', message: 'Sync is not configured.', retry_at: 0 })
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10))
  const [locationName, setLocationName] = useState('')
  const [selectedSession, setSelectedSession] = useState('')
  const [bandNumber, setBandNumber] = useState('')
  const [speciesCode, setSpeciesCode] = useState('')
  const [editing, setEditing] = useState<PilotBandingRecord>()

  const refresh = useCallback(async () => setProjection(projectPilotBanding(await store.snapshot(access.workspace_id))), [access.workspace_id, store])
  const synchronize = useCallback(async () => {
    if (!sync) return
    await sync.synchronize()
    await refresh()
  }, [refresh, sync])

  useEffect(() => {
    store.activateWorkspace(access.workspace_id)
    void refresh()
    const unsubscribe = sync?.subscribe(setSyncStatus)
    const online = () => { void synchronize() }
    window.addEventListener('online', online)
    void synchronize()
    return () => {
      unsubscribe?.()
      window.removeEventListener('online', online)
    }
  }, [access.workspace_id, refresh, store, sync, synchronize])

  async function createSession(event: FormEvent) {
    event.preventDefault()
    await perform(async () => {
      const hlc = await store.tickClock(access.workspace_id)
      const domainEvent = decideCreateSession({
        workspace_id: access.workspace_id,
        actor: { kind: 'user-account', user_account_id: access.user_account_id },
        hlc,
      }, { session_date: value(sessionDate), location_name: value(locationName) })
      const result = await store.appendAll([domainEvent])
      ensureAccepted(result)
      setSelectedSession(domainEvent.payload.session_id)
      setLocationName('')
    })
  }

  async function createRecord(event: FormEvent) {
    event.preventDefault()
    if (!selectedSession) return
    await perform(async () => {
      const events = await store.snapshot(access.workspace_id)
      const hlc = await store.tickClock(access.workspace_id)
      const domainEvent = decideCreateBandingRecord(events, {
        workspace_id: access.workspace_id,
        actor: { kind: 'user-account', user_account_id: access.user_account_id },
        hlc,
      }, { session_id: selectedSession, band_number: value(bandNumber), species_code: value(speciesCode) })
      ensureAccepted(await store.appendAll([domainEvent]))
      setBandNumber('')
      setSpeciesCode('')
    })
  }

  async function amendRecord(event: FormEvent) {
    event.preventDefault()
    if (!editing) return
    await perform(async () => {
      const events = await store.snapshot(access.workspace_id)
      const hlc = await store.tickClock(access.workspace_id)
      const domainEvent = decideAmendBandingRecord(events, {
        workspace_id: access.workspace_id,
        actor: { kind: 'user-account', user_account_id: access.user_account_id },
        hlc,
      }, editing.record_id, changedBandingRecordFields(editing, {
        // Empty strings are deliberate field-level amendments that clear a
        // prior optional value; creation omits empty fields instead.
        band_number: bandNumber.trim(),
        species_code: speciesCode.trim(),
      }))
      ensureAccepted(await store.appendAll([domainEvent]))
      setEditing(undefined)
      setBandNumber('')
      setSpeciesCode('')
    })
  }

  async function perform(work: () => Promise<void>) {
    setError(undefined)
    setSaving(true)
    try {
      await work()
      await refresh()
      void synchronize()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save the Event.')
    } finally {
      setSaving(false)
    }
  }

  function beginEdit(record: PilotBandingRecord) {
    setEditing(record)
    setBandNumber(record.band_number ?? '')
    setSpeciesCode(record.species_code ?? '')
  }

  const sessions = [...projection.sessions.values()].sort((a, b) => (b.session_date ?? '').localeCompare(a.session_date ?? ''))
  const records = [...projection.banding_records.values()].filter(record => !selectedSession || record.session_id === selectedSession)

  return (
    <main style={styles.page}>
      <PageHeader title="Collaboration Pilot" onHome={onHome} />
      <section style={styles.status} aria-live="polite">
        <strong>{access.workspace_name}</strong>
        <span>{statusText(syncStatus)}</span>
        <button type="button" style={styles.smallButton} onClick={() => void synchronize()}>Sync now</button>
      </section>
      {error && <p style={styles.error}>{error}</p>}

      <form style={styles.card} onSubmit={createSession}>
        <h2 style={styles.heading}>New Session</h2>
        <label>Date<input style={styles.input} type="date" value={sessionDate} onChange={event => setSessionDate(event.target.value)} /></label>
        <label>Location<input style={styles.input} value={locationName} onChange={event => setLocationName(event.target.value)} placeholder="Optional" /></label>
        <button style={styles.primary} type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create Session'}</button>
      </form>

      <section style={styles.card}>
        <h2 style={styles.heading}>Pilot Sessions</h2>
        {sessions.length === 0 ? <p>No Sessions yet. Creating one works offline.</p> : sessions.map(session => (
          <button key={session.session_id} type="button" style={selectedSession === session.session_id ? styles.selected : styles.row} onClick={() => setSelectedSession(session.session_id)}>
            <strong>{session.session_date || 'Date not entered'}</strong><span>{session.location_name || 'Location not entered'}</span>
          </button>
        ))}
      </section>

      {selectedSession && (
        <form style={styles.card} onSubmit={editing ? amendRecord : createRecord}>
          <h2 style={styles.heading}>{editing ? 'Amend Banding Record' : 'New Banding Record'}</h2>
          <label>Physical band<input style={styles.input} value={bandNumber} onChange={event => setBandNumber(event.target.value)} placeholder="Optional" /></label>
          <label>Species code<input style={styles.input} value={speciesCode} onChange={event => setSpeciesCode(event.target.value.toUpperCase())} placeholder="Optional" /></label>
          <button style={styles.primary} type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Amendment' : 'Create Record'}</button>
          {editing && <button style={styles.smallButton} type="button" onClick={() => setEditing(undefined)}>Cancel</button>}
        </form>
      )}

      {projection.band_allocation_conflicts.length > 0 && (
        <section style={styles.conflict}>
          <h2 style={styles.heading}>Band allocation conflicts</h2>
          {projection.band_allocation_conflicts.map(conflict => <p key={conflict.band_number}><strong>{conflict.band_number}</strong> is assigned to {conflict.record_ids.length} records. Both facts are retained for Admin correction.</p>)}
        </section>
      )}

      <section style={styles.card}>
        <h2 style={styles.heading}>Banding Records</h2>
        {records.length === 0 ? <p>No records in this Session.</p> : records.map(record => (
          <button key={record.record_id} type="button" style={styles.row} onClick={() => beginEdit(record)}>
            <strong>{record.species_code || 'Species not entered'}</strong><span>{record.band_number || 'No physical band'}</span>
          </button>
        ))}
      </section>
    </main>
  )
}

function value(input: string): string | undefined {
  const trimmed = input.trim()
  return trimmed || undefined
}

function ensureAccepted(results: readonly { kind: string; reason?: string }[]): void {
  const rejected = results.find(result => result.kind === 'rejected')
  if (rejected) throw new Error(rejected.reason ?? 'Local Event was rejected.')
}

function statusText(status: SyncStatus): string {
  if (status.kind === 'syncing') return 'Syncing…'
  if (status.kind === 'offline') return `Offline — changes stay on this device (${status.message})`
  if (status.kind === 'attention') return `${status.rejected} Event${status.rejected === 1 ? '' : 's'} need attention`
  return status.last_synced_at ? `Synced ${new Date(status.last_synced_at).toLocaleTimeString()}` : 'Ready to sync'
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', padding: '1rem 1.25rem 3rem', background: '#f5f5f5', color: '#1b4332', display: 'flex', flexDirection: 'column', gap: '1rem' },
  status: { display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.35rem 1rem', alignItems: 'center', background: '#e8f5e9', borderRadius: 10, padding: '0.8rem' },
  card: { display: 'flex', flexDirection: 'column', gap: '0.7rem', padding: '1rem', background: '#fff', borderRadius: 10 },
  heading: { margin: 0, fontSize: '1.05rem' },
  input: { display: 'block', width: '100%', minHeight: 44, marginTop: 4, padding: '0.55rem', border: '1px solid #aaa', borderRadius: 7 },
  primary: { minHeight: 44, border: 0, borderRadius: 8, background: '#2d6a4f', color: '#fff', fontWeight: 700 },
  smallButton: { minHeight: 38, padding: '0.35rem 0.7rem', border: '1px solid #2d6a4f', borderRadius: 7, background: '#fff', color: '#2d6a4f' },
  row: { display: 'flex', justifyContent: 'space-between', gap: '1rem', minHeight: 44, alignItems: 'center', padding: '0.65rem', border: '1px solid #d6ddd9', borderRadius: 7, background: '#fff', color: '#1b4332', textAlign: 'left' },
  selected: { display: 'flex', justifyContent: 'space-between', gap: '1rem', minHeight: 44, alignItems: 'center', padding: '0.65rem', border: '2px solid #2d6a4f', borderRadius: 7, background: '#e8f5e9', color: '#1b4332', textAlign: 'left' },
  conflict: { padding: '1rem', background: '#fff3cd', border: '1px solid #d39e00', borderRadius: 10, color: '#5c4400' },
  error: { margin: 0, padding: '0.75rem', background: '#f8d7da', color: '#721c24', borderRadius: 8 },
}
