import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { decideOperationalCommand, projectOperationalEvents, type OperationalEntityKind } from '@birdnerd/banding'
import type { SyncStatus } from '@birdnerd/sync-state'
import PageHeader from '../components/PageHeader'
import { useWorkspaceAccess } from '../components/WorkspaceAccessGate'
import { getFieldCollaboration } from '../sync/fieldCollaboration'

type Tab = 'sessions' | 'records' | 'inventory' | 'configuration'

/**
 * Default Phase 31 Field surface. It reads only the rebuildable operational
 * projection and appends commands to the durable Event replica; it never
 * reads or writes the legacy mutable IndexedDB stores.
 */
export default function OperationalWorkspacePage({ onHome }: { onHome: () => void }) {
  const access = useWorkspaceAccess()
  const { store, sync } = useMemo(getFieldCollaboration, [])
  const [projection, setProjection] = useState(() => projectOperationalEvents([]))
  const [status, setStatus] = useState<SyncStatus>(sync?.getState() ?? { kind: 'offline', message: 'Sync is not configured.', retry_at: 0 })
  const [tab, setTab] = useState<Tab>('sessions')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10))
  const [speciesCode, setSpeciesCode] = useState('')
  const [bandMode, setBandMode] = useState<'unbanded' | 'foreign' | 'managed'>('unbanded')
  const [bandNumber, setBandNumber] = useState('')
  const [managedBandId, setManagedBandId] = useState('')
  const [stationName, setStationName] = useState('')
  const [netLabel, setNetLabel] = useState('')
  const [personName, setPersonName] = useState('')
  const [personInitials, setPersonInitials] = useState('')
  const [banderPersonId, setBanderPersonId] = useState('')
  const [banderRole, setBanderRole] = useState('Bander')

  const refresh = useCallback(async () => setProjection(projectOperationalEvents(await store.snapshot(access.workspace_id))), [access.workspace_id, store])
  const synchronize = useCallback(async () => { if (sync) await sync.synchronize(); await refresh() }, [refresh, sync])
  useEffect(() => {
    store.activateWorkspace(access.workspace_id)
    void refresh()
    const unsubscribe = sync?.subscribe(setStatus)
    const online = () => { void synchronize() }
    window.addEventListener('online', online)
    void synchronize()
    return () => { unsubscribe?.(); window.removeEventListener('online', online) }
  }, [access.workspace_id, refresh, store, sync, synchronize])

  const entities = [...projection.entities.values()]
  const active = (kind: OperationalEntityKind) => entities.filter(entity => entity.kind === kind && entity.active)
  const stations = active('station')
  const sessions = active('session')
  const bands = active('band')
  const people = active('person')
  const banders = active('bander')
  const records = active('banding-record').filter(record => !sessionId || record.fields.session_id === sessionId)

  async function perform(work: () => Promise<void>) {
    setError(undefined); setSaving(true)
    try { await work(); await refresh(); void synchronize() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the Event.') }
    finally { setSaving(false) }
  }
  async function decide(command: Parameters<typeof decideOperationalCommand>[2]) {
    const events = await store.snapshot(access.workspace_id)
    const decision = decideOperationalCommand(projectOperationalEvents(events), {
      workspace_id: access.workspace_id, user_account_id: access.user_account_id, role: access.role,
      hlc: await store.tickClock(access.workspace_id),
    }, command)
    const results = await store.appendAll(decision.events)
    const rejected = results.find(result => result.kind === 'rejected')
    if (rejected?.kind === 'rejected') throw new Error(rejected.reason)
  }
  function createSession(event: FormEvent) {
    event.preventDefault()
    void perform(async () => {
      await decide({ kind: 'create', entity_kind: 'session', fields: compact({ session_date: sessionDate, station_id: stationIdOrUndefined() }) })
      setSessionDate(new Date().toISOString().slice(0, 10))
    })
  }
  function createRecord(event: FormEvent) {
    event.preventDefault()
    if (!sessionId) return
    void perform(async () => {
      const band_selection = bandMode === 'unbanded' ? { kind: 'unbanded' }
        : bandMode === 'foreign' ? { kind: 'foreign', band_number: bandNumber.trim() }
          : { kind: 'managed', band_id: managedBandId, band_number: bands.find(band => band.id === managedBandId)?.fields.band_number }
      await decide({ kind: 'create', entity_kind: 'banding-record', session_id: sessionId, fields: compact({ species_code: speciesCode.trim().toUpperCase(), band_selection }) })
      setSpeciesCode(''); setBandNumber(''); setManagedBandId('')
    })
  }
  function createStation(event: FormEvent) {
    event.preventDefault(); void perform(async () => { await decide({ kind: 'create', entity_kind: 'station', fields: compact({ name: stationName.trim() }) }); setStationName('') })
  }
  function createNet(event: FormEvent) {
    event.preventDefault(); const station_id = stationIdOrUndefined(); if (!station_id) return
    void perform(async () => { await decide({ kind: 'create', entity_kind: 'net', station_id, fields: compact({ label: netLabel.trim() }) }); setNetLabel('') })
  }
  function receiveBand(event: FormEvent) {
    event.preventDefault(); void perform(async () => { await decide({ kind: 'receive-bands', bands: [{ band_number: bandNumber.trim() }] }); setBandNumber('') })
  }
  function createPerson(event: FormEvent) {
    event.preventDefault(); void perform(async () => {
      await decide({ kind: 'create', entity_kind: 'person', fields: compact({ name: personName.trim(), initials: personInitials.trim().toUpperCase() }) })
      setPersonName(''); setPersonInitials('')
    })
  }
  function createBander(event: FormEvent) {
    event.preventDefault(); if (!banderPersonId) return
    void perform(async () => { await decide({ kind: 'create', entity_kind: 'bander', person_id: banderPersonId, fields: { role: banderRole } }); setBanderPersonId('') })
  }
  function linkSignedInPerson(person_id: string) { void perform(() => decide({ kind: 'link-user-account-person', user_account_id: access.user_account_id, person_id })) }
  function stationIdOrUndefined() { return stations[0]?.id }

  return <main style={styles.page}>
    <PageHeader title="Field Data" onHome={onHome} />
    <section style={styles.status}><strong>{access.workspace_name}</strong><span>{statusText(status)}</span><button type="button" onClick={() => void synchronize()}>Sync now</button></section>
    {error && <p style={styles.error}>{error}</p>}
    <nav style={styles.tabs}>{(['sessions', 'records', 'inventory', 'configuration'] as const).map(item => <button key={item} type="button" onClick={() => setTab(item)} style={tab === item ? styles.selected : styles.tab}>{item}</button>)}</nav>
    {tab === 'sessions' && <><form style={styles.card} onSubmit={createSession}><h2>New Session</h2><label>Date<input type="date" value={sessionDate} onChange={event => setSessionDate(event.target.value)} /></label><p>Station: {stations[0]?.fields.name as string ?? 'Configure a Station first'}</p><button disabled={saving || !stationIdOrUndefined()}>Create offline</button></form><EntityList title="Sessions" entities={sessions} onDeactivate={entity => void perform(() => decide({ kind: 'deactivate', entity_kind: 'session', entity_id: entity.id }))} /></>}
    {tab === 'records' && <><section style={styles.card}><h2>Session</h2><select value={sessionId} onChange={event => setSessionId(event.target.value)}><option value="">Choose a Session</option>{sessions.map(session => <option key={session.id} value={session.id}>{String(session.fields.session_date ?? session.id)}</option>)}</select></section>{sessionId && <form style={styles.card} onSubmit={createRecord}><h2>New Banding Record</h2><label>Species code<input value={speciesCode} onChange={event => setSpeciesCode(event.target.value)} /></label><label>Band selection<select value={bandMode} onChange={event => setBandMode(event.target.value as typeof bandMode)}><option value="unbanded">Unbanded</option><option value="foreign">Foreign</option><option value="managed">Managed inventory</option></select></label>{bandMode === 'foreign' && <label>Band number<input value={bandNumber} onChange={event => setBandNumber(event.target.value)} /></label>}{bandMode === 'managed' && <select value={managedBandId} onChange={event => setManagedBandId(event.target.value)}><option value="">Choose inventory Band</option>{bands.map(band => <option key={band.id} value={band.id}>{String(band.fields.band_number)}</option>)}</select>}<button disabled={saving || (bandMode === 'managed' && !managedBandId)}>Save offline</button></form>}<EntityList title="Banding Records" entities={records} onDeactivate={entity => void perform(() => decide({ kind: 'deactivate', entity_kind: 'banding-record', entity_id: entity.id }))} /></>}
    {tab === 'inventory' && <><form style={styles.card} onSubmit={receiveBand}><h2>Receive Band</h2><label>Band number<input value={bandNumber} onChange={event => setBandNumber(event.target.value)} required /></label><button disabled={saving}>Receive offline</button></form><EntityList title="Inventory" entities={bands} onDeactivate={entity => void perform(() => decide({ kind: 'deactivate', entity_kind: 'band', entity_id: entity.id }))} />{projection.band_number_conflicts.map(conflict => <p style={styles.warning} key={conflict.band_number}>Duplicate normalized Band number {conflict.band_number}; both facts remain until corrected.</p>)}</>}
    {tab === 'configuration' && (access.role === 'admin' ? <><form style={styles.card} onSubmit={createStation}><h2>Station</h2><label>Name<input value={stationName} onChange={event => setStationName(event.target.value)} /></label><button disabled={saving}>Add Station</button></form><form style={styles.card} onSubmit={createNet}><h2>Net</h2><label>Label<input value={netLabel} onChange={event => setNetLabel(event.target.value)} /></label><button disabled={saving || !stationIdOrUndefined()}>Add Net</button></form><form style={styles.card} onSubmit={createPerson}><h2>Roster Person</h2><label>Name<input value={personName} onChange={event => setPersonName(event.target.value)} /></label><label>Initials<input value={personInitials} onChange={event => setPersonInitials(event.target.value)} /></label><button disabled={saving}>Add Person</button></form><form style={styles.card} onSubmit={createBander}><h2>Bander role</h2><select value={banderPersonId} onChange={event => setBanderPersonId(event.target.value)}><option value="">Choose a Person</option>{people.map(person => <option key={person.id} value={person.id}>{String(person.fields.name ?? person.id)}</option>)}</select><select value={banderRole} onChange={event => setBanderRole(event.target.value)}>{['Master Bander','Sub-permittee','Bander','Trainee'].map(role => <option key={role}>{role}</option>)}</select><button disabled={saving || !banderPersonId}>Add Bander</button></form><EntityList title="Stations" entities={stations} onDeactivate={entity => void perform(() => decide({ kind: 'deactivate', entity_kind: 'station', entity_id: entity.id }))} /><EntityList title="Nets" entities={active('net')} onDeactivate={entity => void perform(() => decide({ kind: 'deactivate', entity_kind: 'net', entity_id: entity.id }))} /><section style={styles.card}><h2>Roster</h2>{people.length === 0 ? <p>None yet.</p> : people.map(person => <div key={person.id} style={styles.row}><span>{String(person.fields.name ?? person.id)} — {String(person.fields.initials ?? '')}</span><button type="button" onClick={() => linkSignedInPerson(person.id)}>Link my account</button></div>)}</section><EntityList title="Banders" entities={banders} onDeactivate={entity => void perform(() => decide({ kind: 'deactivate', entity_kind: 'bander', entity_id: entity.id }))} /></> : <p style={styles.warning}>An Admin configures Stations, Nets, and the roster. Membership changes remain in the Provisioner CLI.</p>)}
  </main>
}

function EntityList({ title, entities, onDeactivate }: { title: string; entities: readonly { id: string; fields: Record<string, unknown> }[]; onDeactivate: (entity: { id: string }) => void }) { return <section style={styles.card}><h2>{title}</h2>{entities.length === 0 ? <p>None yet.</p> : entities.map(entity => <div key={entity.id} style={styles.row}><span>{String(entity.fields.name ?? entity.fields.label ?? entity.fields.session_date ?? entity.fields.species_code ?? entity.fields.band_number ?? entity.id)}</span><button type="button" onClick={() => onDeactivate(entity)}>Deactivate</button></div>)}</section> }
function compact(fields: Record<string, unknown>) { return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== '' && value !== undefined)) }
function statusText(status: SyncStatus) { return status.kind === 'syncing' ? 'Syncing…' : status.kind === 'offline' ? `Offline — changes stay on this device (${status.message})` : status.kind === 'attention' ? `${status.rejected} Events need attention` : status.last_synced_at ? `Synced ${new Date(status.last_synced_at).toLocaleTimeString()}` : 'Ready to sync' }
const styles: Record<string, React.CSSProperties> = { page: { minHeight: '100dvh', padding: '1rem 1.25rem 3rem', background: '#f5f5f5', color: '#1b4332', display: 'flex', flexDirection: 'column', gap: '1rem' }, status: { display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.35rem 1rem', alignItems: 'center', background: '#e8f5e9', borderRadius: 10, padding: '0.8rem' }, tabs: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }, tab: { minHeight: 40, textTransform: 'capitalize' }, selected: { minHeight: 40, textTransform: 'capitalize', background: '#2d6a4f', color: '#fff' }, card: { display: 'flex', flexDirection: 'column', gap: '0.7rem', padding: '1rem', background: '#fff', borderRadius: 10 }, row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.6rem', borderTop: '1px solid #ddd' }, error: { margin: 0, padding: '0.75rem', background: '#f8d7da', color: '#721c24', borderRadius: 8 }, warning: { margin: 0, padding: '0.75rem', background: '#fff3cd', color: '#5c4400', borderRadius: 8 } }
