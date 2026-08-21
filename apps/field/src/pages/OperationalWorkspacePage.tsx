import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { decideOperationalCommand, projectOperationalEvents, type OperationalEntity, type OperationalEntityKind } from '@birdnerd/banding'
import { createUuidV7 } from '@birdnerd/events'
import type { SyncStatus } from '@birdnerd/sync-state'
import {
  AGE_CODES, BIRD_STATUS_CODES, BP_CODES, CAPTURE_STATUS_CODES, CP_CODES,
  DISPOSITION_CODES, FAT_CODES, FF_MOLT_CODES, FF_WEAR_CODES, HOW_AGED_CODES,
  HOW_SEXED_CODES, JUV_BODY_PLUMAGE_CODES, MOLT_CODES, MOLT_LIMITS_CODES,
  PRESENT_CONDITION_CODES, SEX_CODES, SKULL_CODES, WRP_CODES,
} from '../data/codes'
import PageHeader from '../components/PageHeader'
import { useWorkspaceAccess } from '../components/WorkspaceAccessGate'
import { getFieldCollaboration } from '../sync/fieldCollaboration'

type Tab = 'sessions' | 'records' | 'inventory' | 'configuration'
type BandMode = 'unbanded' | 'foreign' | 'managed'
type Draft = Record<string, string | boolean>
type Code = { code: string; label: string }

const SESSION_KEYS = ['session_date', 'station_id', 'protocol', 'maps_period', 'open_time', 'close_time', 'master_bander_id', 'weather_open_temp', 'weather_open_wind', 'weather_open_cloud', 'weather_open_precip', 'weather_close_temp', 'weather_close_wind', 'weather_close_cloud', 'weather_close_precip', 'notes'] as const
const RECORD_KEYS = ['species_code', 'capture_code', 'wrp', 'age', 'how_aged', 'how_aged_2', 'sex', 'how_sexed', 'how_sexed_2', 'skull', 'cp', 'bp', 'fat', 'body_molt', 'ff_molt', 'ff_wear', 'juv_body_plumage', 'molt_limits_p_covs', 'molt_limits_s_covs', 'molt_limits_alula', 'molt_limits_pp', 'molt_limits_ss', 'molt_limits_tert', 'molt_limits_rec', 'molt_limits_body_plum', 'molt_limits_non_feather', 'wing', 'tail', 'tarsus', 'exposed_culmen', 'other_measurement', 'body_mass', 'status', 'disposition', 'capture_time', 'release_time', 'net_id', 'bander_id', 'present_condition', 'replaced_band_number', 'notes', 'feather_pull', 'blood_sample'] as const
const NUMBER_KEYS = new Set(['maps_period', 'weather_open_temp', 'weather_open_wind', 'weather_open_cloud', 'weather_close_temp', 'weather_close_wind', 'weather_close_cloud', 'wing', 'tail', 'tarsus', 'exposed_culmen', 'other_measurement', 'body_mass'])
const BOOLEAN_KEYS = new Set(['feather_pull', 'blood_sample'])
const ROLE_ORDER: Record<string, number> = { 'Master Bander': 0, 'Sub-permittee': 1, Bander: 2, Trainee: 3 }

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
  const [editingSessionId, setEditingSessionId] = useState('')
  const [plannedCrew, setPlannedCrew] = useState<Set<string>>(new Set())
  const [editingRecordId, setEditingRecordId] = useState('')
  const [sessionDraft, setSessionDraft] = useState<Draft>(() => ({ session_date: today() }))
  const [recordDraft, setRecordDraft] = useState<Draft>({ feather_pull: false, blood_sample: false })
  const [bandMode, setBandMode] = useState<BandMode>('unbanded')
  const [foreignBandNumber, setForeignBandNumber] = useState('')
  const [managedBandId, setManagedBandId] = useState('')
  const [stationName, setStationName] = useState('')
  const [editingStationId, setEditingStationId] = useState('')
  const [netLabel, setNetLabel] = useState('')
  const [netStationId, setNetStationId] = useState('')
  const [editingNetId, setEditingNetId] = useState('')
  const [personName, setPersonName] = useState('')
  const [personInitials, setPersonInitials] = useState('')
  const [editingPersonId, setEditingPersonId] = useState('')
  const [banderPersonId, setBanderPersonId] = useState('')
  const [banderRole, setBanderRole] = useState('Bander')
  const [editingBanderId, setEditingBanderId] = useState('')
  const [bandNumber, setBandNumber] = useState('')
  const [editingBandId, setEditingBandId] = useState('')
  const [linkUserAccountId, setLinkUserAccountId] = useState('')
  const [linkPersonId, setLinkPersonId] = useState('')

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
  const sessions = active('session').sort((a, b) => text(b.fields.session_date).localeCompare(text(a.fields.session_date)))
  const bands = active('band').sort((a, b) => text(a.fields.band_number).localeCompare(text(b.fields.band_number)))
  const inventoryBands = entities.filter(entity => entity.kind === 'band').sort((a, b) => text(a.fields.band_number).localeCompare(text(b.fields.band_number)))
  const people = active('person')
  const banders = active('bander').filter(bander => people.some(person => person.id === bander.fields.person_id)).sort((a, b) => ROLE_ORDER[text(a.fields.role)] - ROLE_ORDER[text(b.fields.role)] || banderLabel(a, people).localeCompare(banderLabel(b, people)))
  const linkedBander = banders.find(bander => bander.fields.person_id === projection.person_by_user_account.get(access.user_account_id))
  const selectedSession = sessions.find(session => session.id === sessionId)
  const selectedStationId = text(selectedSession?.fields.station_id)
  const stationNets = active('net').filter(net => text(net.fields.station_id) === selectedStationId).sort((a, b) => text(a.fields.label).localeCompare(text(b.fields.label), undefined, { numeric: true }))
  const sessionRecords = active('banding-record').filter(record => !sessionId || text(record.fields.session_id) === sessionId)
  const managedDeployments = new Map<string, OperationalEntity[]>(bands.map(band => [band.id, active('banding-record').filter(record => managedBandIdFrom(record) === band.id && isNewDeployment(record.fields.capture_code))]))

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
  function updateSession(key: string, value: string) { setSessionDraft(draft => ({ ...draft, [key]: value })) }
  function updateRecord(key: string, value: string | boolean) { setRecordDraft(draft => ({ ...draft, [key]: value })) }
  function createSession(event: FormEvent) {
    event.preventDefault()
    void perform(async () => {
      const fields = eventFields(sessionDraft, SESSION_KEYS)
      if (editingSessionId) {
        const current = projection.entities.get(editingSessionId)
        if (!current) throw new Error('Session no longer exists.')
        const changes = changedFields(current.fields, fields)
        if (Object.keys(changes).length) await decide({ kind: 'amend', entity_kind: 'session', entity_id: editingSessionId, fields: changes })
      } else {
        const entity_id = createUuidV7()
        await decide({ kind: 'create', entity_kind: 'session', entity_id, fields: compact(fields) })
        for (const bander_id of plannedCrew) await decide({ kind: 'set-session-crew', session_id: entity_id, bander_id, present: true })
      }
      setEditingSessionId(''); setPlannedCrew(new Set()); setSessionDraft({ session_date: today() })
    })
  }
  function createRecord(event: FormEvent) {
    event.preventDefault()
    if (!sessionId) return
    void perform(async () => {
      const band_selection = currentBandSelection(bandMode, foreignBandNumber, managedBandId, bands)
      const fields = { ...eventFields(recordDraft, RECORD_KEYS), band_selection }
      if (editingRecordId) {
        const current = projection.entities.get(editingRecordId)
        if (!current) throw new Error('Banding Record no longer exists.')
        const changes = changedFields(current.fields, fields)
        if (Object.keys(changes).length) await decide({ kind: 'amend', entity_kind: 'banding-record', entity_id: editingRecordId, fields: changes })
      } else await decide({ kind: 'create', entity_kind: 'banding-record', session_id: sessionId, fields: compact(fields) })
      resetRecord()
    })
  }
  function resetRecord() { setEditingRecordId(''); setRecordDraft({ feather_pull: false, blood_sample: false, ...(linkedBander ? { bander_id: linkedBander.id } : {}) }); setBandMode('unbanded'); setForeignBandNumber(''); setManagedBandId('') }
  function selectBandMode(mode: BandMode) {
    setBandMode(mode)
    setRecordDraft(draft => ({ ...draft, capture_code: mode === 'foreign' ? 'F' : mode === 'unbanded' ? 'U' : draft.capture_code }))
  }
  function selectManagedBand(id: string) {
    setManagedBandId(id)
    const deployed = (managedDeployments.get(id)?.length ?? 0) > 0
    setRecordDraft(draft => ({ ...draft, capture_code: deployed ? 'R' : '1' }))
  }
  function beginSessionEdit(id: string) {
    if (!id) { setEditingSessionId(''); setPlannedCrew(new Set()); setSessionDraft({ session_date: today() }); return }
    const session = projection.entities.get(id)
    if (!session) return
    setEditingSessionId(id); setSessionDraft(draftFrom(session.fields, SESSION_KEYS))
  }
  function beginRecordEdit(id: string) {
    if (!id) { resetRecord(); return }
    const record = projection.entities.get(id)
    if (!record) return
    const selection = record.fields.band_selection as { kind?: BandMode; band_number?: string; band_id?: string } | null
    setEditingRecordId(id); setRecordDraft(draftFrom(record.fields, RECORD_KEYS)); setBandMode(selection?.kind ?? 'unbanded'); setForeignBandNumber(selection?.band_number ?? ''); setManagedBandId(selection?.band_id ?? '')
  }
  function createStation(event: FormEvent) { event.preventDefault(); void perform(async () => { if (editingStationId) await decide({ kind: 'amend', entity_kind: 'station', entity_id: editingStationId, fields: { name: stationName.trim() || null } }); else await decide({ kind: 'create', entity_kind: 'station', fields: compact({ name: stationName.trim() }) }); setStationName(''); setEditingStationId('') }) }
  function createNet(event: FormEvent) { event.preventDefault(); if (!netStationId) return; void perform(async () => { if (editingNetId) await decide({ kind: 'amend', entity_kind: 'net', entity_id: editingNetId, fields: { label: netLabel.trim() || null, station_id: netStationId } }); else await decide({ kind: 'create', entity_kind: 'net', station_id: netStationId, fields: compact({ label: netLabel.trim() }) }); setNetLabel(''); setNetStationId(''); setEditingNetId('') }) }
  function receiveBand(event: FormEvent) { event.preventDefault(); void perform(async () => { if (editingBandId) await decide({ kind: 'amend', entity_kind: 'band', entity_id: editingBandId, fields: { band_number: bandNumber.trim() || null } }); else await decide({ kind: 'receive-bands', bands: [{ band_number: bandNumber.trim() }] }); setBandNumber(''); setEditingBandId('') }) }
  function createPerson(event: FormEvent) { event.preventDefault(); void perform(async () => { if (editingPersonId) await decide({ kind: 'amend', entity_kind: 'person', entity_id: editingPersonId, fields: { name: personName.trim() || null, initials: personInitials.trim().toUpperCase() || null } }); else await decide({ kind: 'create', entity_kind: 'person', fields: compact({ name: personName.trim(), initials: personInitials.trim().toUpperCase() }) }); setPersonName(''); setPersonInitials(''); setEditingPersonId('') }) }
  function createBander(event: FormEvent) { event.preventDefault(); if (!banderPersonId) return; void perform(async () => { if (editingBanderId) await decide({ kind: 'amend', entity_kind: 'bander', entity_id: editingBanderId, fields: { person_id: banderPersonId, role: banderRole } }); else await decide({ kind: 'create', entity_kind: 'bander', person_id: banderPersonId, fields: { role: banderRole } }); setBanderPersonId(''); setEditingBanderId('') }) }
  function beginConfigurationEdit(entity: OperationalEntity) {
    if (entity.kind === 'station') { setEditingStationId(entity.id); setStationName(text(entity.fields.name)); return }
    if (entity.kind === 'net') { setEditingNetId(entity.id); setNetLabel(text(entity.fields.label)); setNetStationId(text(entity.fields.station_id)); return }
    if (entity.kind === 'person') { setEditingPersonId(entity.id); setPersonName(text(entity.fields.name)); setPersonInitials(text(entity.fields.initials)); return }
    if (entity.kind === 'bander') { setEditingBanderId(entity.id); setBanderPersonId(text(entity.fields.person_id)); setBanderRole(text(entity.fields.role) || 'Bander'); return }
    if (entity.kind === 'band') { setEditingBandId(entity.id); setBandNumber(text(entity.fields.band_number)) }
  }
  function toggleCrew(banderId: string) {
    if (!editingSessionId) { setPlannedCrew(current => { const next = new Set(current); if (next.has(banderId)) next.delete(banderId); else next.add(banderId); return next }); return }
    const present = projection.session_crew.has(`${editingSessionId}:${banderId}`)
    void perform(() => decide({ kind: 'set-session-crew', session_id: editingSessionId, bander_id: banderId, present: !present }))
  }
  function linkPerson(event: FormEvent) { event.preventDefault(); const user_account_id = linkUserAccountId.trim() || access.user_account_id; void perform(async () => { await decide({ kind: 'link-user-account-person', user_account_id, person_id: linkPersonId || undefined }); setLinkUserAccountId(''); setLinkPersonId('') }) }
  function correctRecord(recordId: string) { setTab('records'); setSessionId(text(projection.entities.get(recordId)?.fields.session_id)); beginRecordEdit(recordId) }

  return <main style={styles.page}>
    <PageHeader title="Field Data" onHome={onHome} />
    <section style={styles.status}><strong>{access.workspace_name}</strong><span>{statusText(status)}</span><button type="button" onClick={() => void synchronize()}>Sync now</button></section>
    {error && <p style={styles.error}>{error}</p>}
    <nav style={styles.tabs}>{(['sessions', 'records', 'inventory', 'configuration'] as const).map(item => <button key={item} type="button" onClick={() => setTab(item)} style={tab === item ? styles.selected : styles.tab}>{item}</button>)}</nav>
    {tab === 'sessions' && <>
      <section style={styles.card}><label>Edit existing Session<select value={editingSessionId} onChange={event => beginSessionEdit(event.target.value)}><option value="">New Session</option>{sessions.map(session => <option key={session.id} value={session.id}>{sessionLabel(session, stations)}</option>)}</select></label></section>
      <form style={styles.card} onSubmit={createSession}><h2>{editingSessionId ? 'Amend Session' : 'New Session'}</h2>
        <FormRow><TextField label="Date"><input type="date" value={text(sessionDraft.session_date)} onChange={event => updateSession('session_date', event.target.value)} /></TextField><SelectField label="Station" value={text(sessionDraft.station_id)} onChange={value => updateSession('station_id', value)} options={stations.map(station => ({ code: station.id, label: text(station.fields.name) || station.id }))} /></FormRow>
        <FormRow><SelectField label="Protocol" value={text(sessionDraft.protocol)} onChange={value => updateSession('protocol', value)} options={['MAPS', 'Non-MAPS', 'Burrowing Owl', 'Rehabbed-Bird', 'Saw-whet Owl'].map(code => ({ code, label: code }))} /><TextField label="MAPS Period"><input type="number" min="1" max="10" value={text(sessionDraft.maps_period)} onChange={event => updateSession('maps_period', event.target.value)} /></TextField></FormRow>
        <FormRow><TextField label="Open Time"><input type="time" value={text(sessionDraft.open_time)} onChange={event => updateSession('open_time', event.target.value)} /></TextField><TextField label="Close Time"><input type="time" value={text(sessionDraft.close_time)} onChange={event => updateSession('close_time', event.target.value)} /></TextField></FormRow>
        <SelectField label="Master Bander" value={text(sessionDraft.master_bander_id)} onChange={value => updateSession('master_bander_id', value)} options={banders.map(bander => ({ code: bander.id, label: banderLabel(bander, people) }))} />
        <section style={styles.crew}><strong>Session crew (optional)</strong>{banders.length === 0 ? <p>Configure active Banders first.</p> : banders.map(bander => <label key={bander.id} style={styles.check}><input type="checkbox" checked={editingSessionId ? projection.session_crew.has(`${editingSessionId}:${bander.id}`) : plannedCrew.has(bander.id)} onChange={() => toggleCrew(bander.id)} />{banderLabel(bander, people)}</label>)}</section>
        <WeatherSection title="Weather at Open" draft={sessionDraft} prefix="weather_open" update={updateSession} /><WeatherSection title="Weather at Close" draft={sessionDraft} prefix="weather_close" update={updateSession} />
        <TextField label="Notes"><textarea rows={2} value={text(sessionDraft.notes)} onChange={event => updateSession('notes', event.target.value)} /></TextField>
        <p style={styles.hint}>All fields are optional. Save keeps this Session locally before it synchronizes.</p><button disabled={saving}>Save offline</button>{editingSessionId && <button type="button" onClick={() => beginSessionEdit('')}>Cancel amendment</button>}
      </form>
      <EntityList title="Sessions" entities={entities.filter(entity => entity.kind === 'session')} detail={entity => sessionLabel(entity, stations)} onDeactivate={entity => void perform(() => decide({ kind: entity.active ? 'deactivate' : 'reactivate', entity_kind: 'session', entity_id: entity.id }))} />
    </>}
    {tab === 'records' && <>
      <section style={styles.card}><h2>Session</h2><select value={sessionId} onChange={event => { setSessionId(event.target.value); resetRecord() }}><option value="">Choose a Session</option>{sessions.map(session => <option key={session.id} value={session.id}>{sessionLabel(session, stations)}</option>)}</select></section>
      {sessionId && <><section style={styles.card}><label>Edit existing Record<select value={editingRecordId} onChange={event => beginRecordEdit(event.target.value)}><option value="">New Banding Record</option>{sessionRecords.map(record => <option key={record.id} value={record.id}>{recordLabel(record, bands)}</option>)}</select></label></section>
      <form style={styles.card} onSubmit={createRecord}><h2>{editingRecordId ? 'Amend Banding Record' : 'New Banding Record'}</h2>
        <FormSection title="Identity"><FormRow><TextField label="Species code"><input value={text(recordDraft.species_code)} onChange={event => updateRecord('species_code', event.target.value.toUpperCase())} /></TextField><SelectField label="Capture code" value={text(recordDraft.capture_code)} onChange={value => updateRecord('capture_code', value)} options={CAPTURE_STATUS_CODES} /></FormRow>
          <SelectField label="Band selection" value={bandMode} onChange={value => selectBandMode(value as BandMode)} options={[{ code: 'unbanded', label: 'Unbanded' }, { code: 'foreign', label: 'Foreign recapture' }, { code: 'managed', label: 'Managed inventory' }]} />
          {bandMode === 'foreign' && <TextField label="Foreign band number"><input value={foreignBandNumber} onChange={event => setForeignBandNumber(event.target.value)} /></TextField>}
          {bandMode === 'managed' && <><SelectField label="Managed Band" value={managedBandId} onChange={selectManagedBand} options={bands.map(band => ({ code: band.id, label: `${text(band.fields.band_number)}${(managedDeployments.get(band.id)?.length ?? 0) ? ' — deployed; Recapture selected' : ''}` }))} />{!managedBandId && <p style={styles.warning}>Choose a known inventory Band. Do not classify an unavailable local Band as foreign; sync or correct it later.</p>}</>}
          {text(recordDraft.capture_code) === 'R' && <FormRow><SelectField label="Present Condition" value={text(recordDraft.present_condition)} onChange={value => updateRecord('present_condition', value)} options={PRESENT_CONDITION_CODES} /><TextField label="Replaced Band #"><input value={text(recordDraft.replaced_band_number)} onChange={event => updateRecord('replaced_band_number', event.target.value)} /></TextField></FormRow>}
          <FormRow><SelectField label="Age" value={text(recordDraft.age)} onChange={value => updateRecord('age', value)} options={AGE_CODES} /><SelectField label="How Aged" value={text(recordDraft.how_aged)} onChange={value => updateRecord('how_aged', value)} options={HOW_AGED_CODES} /></FormRow><FormRow><SelectField label="Sex" value={text(recordDraft.sex)} onChange={value => updateRecord('sex', value)} options={SEX_CODES} /><SelectField label="How Sexed" value={text(recordDraft.how_sexed)} onChange={value => updateRecord('how_sexed', value)} options={HOW_SEXED_CODES} /></FormRow><FormRow><SelectField label="How Aged (2nd)" value={text(recordDraft.how_aged_2)} onChange={value => updateRecord('how_aged_2', value)} options={HOW_AGED_CODES} /><SelectField label="How Sexed (2nd)" value={text(recordDraft.how_sexed_2)} onChange={value => updateRecord('how_sexed_2', value)} options={HOW_SEXED_CODES} /></FormRow><SelectField label="WRP" value={text(recordDraft.wrp)} onChange={value => updateRecord('wrp', value)} options={WRP_CODES} />
        </FormSection>
        <FormSection title="Condition"><FormRow><SelectField label="Skull" value={text(recordDraft.skull)} onChange={value => updateRecord('skull', value)} options={SKULL_CODES} /><SelectField label="CP" value={text(recordDraft.cp)} onChange={value => updateRecord('cp', value)} options={CP_CODES} /></FormRow><FormRow><SelectField label="BP" value={text(recordDraft.bp)} onChange={value => updateRecord('bp', value)} options={BP_CODES} /><SelectField label="Fat" value={text(recordDraft.fat)} onChange={value => updateRecord('fat', value)} options={FAT_CODES} /></FormRow><FormRow><SelectField label="Body Molt" value={text(recordDraft.body_molt)} onChange={value => updateRecord('body_molt', value)} options={MOLT_CODES} /><SelectField label="FF Molt" value={text(recordDraft.ff_molt)} onChange={value => updateRecord('ff_molt', value)} options={FF_MOLT_CODES} /></FormRow><FormRow><SelectField label="FF Wear" value={text(recordDraft.ff_wear)} onChange={value => updateRecord('ff_wear', value)} options={FF_WEAR_CODES} /><SelectField label="Juv Body Plumage" value={text(recordDraft.juv_body_plumage)} onChange={value => updateRecord('juv_body_plumage', value)} options={JUV_BODY_PLUMAGE_CODES} /></FormRow></FormSection>
        <FormSection title="Molt Limits & Plumage"><CodeGrid draft={recordDraft} update={updateRecord} /></FormSection>
        <FormSection title="Morphometrics & Status"><FormRow><NumberField label="Wing (mm)" field="wing" draft={recordDraft} update={updateRecord} /><NumberField label="Tail (mm)" field="tail" draft={recordDraft} update={updateRecord} /></FormRow><FormRow><NumberField label="Tarsus (mm)" field="tarsus" draft={recordDraft} update={updateRecord} step="0.01" /><NumberField label="Exp. Culmen (mm)" field="exposed_culmen" draft={recordDraft} update={updateRecord} step="0.01" /></FormRow><FormRow><NumberField label="Body Mass (g)" field="body_mass" draft={recordDraft} update={updateRecord} step="0.1" /><NumberField label="Other measurement" field="other_measurement" draft={recordDraft} update={updateRecord} step="0.01" /></FormRow><FormRow><SelectField label="Status" value={text(recordDraft.status)} onChange={value => updateRecord('status', value)} options={BIRD_STATUS_CODES} /><SelectField label="Disposition" value={text(recordDraft.disposition)} onChange={value => updateRecord('disposition', value)} options={DISPOSITION_CODES} /></FormRow></FormSection>
        <FormSection title="Additional"><FormRow><TextField label="Capture Time"><input type="time" value={text(recordDraft.capture_time)} onChange={event => updateRecord('capture_time', event.target.value)} /></TextField><TextField label="Release Time"><input type="time" value={text(recordDraft.release_time)} onChange={event => updateRecord('release_time', event.target.value)} /></TextField></FormRow><FormRow><SelectField label="Net (active at this Session's Station)" value={text(recordDraft.net_id)} onChange={value => updateRecord('net_id', value)} options={stationNets.map(net => ({ code: net.id, label: text(net.fields.label) || net.id }))} /><SelectField label="Bander" value={text(recordDraft.bander_id)} onChange={value => updateRecord('bander_id', value)} options={banders.map(bander => ({ code: bander.id, label: banderLabel(bander, people) }))} /></FormRow><label style={styles.check}><input type="checkbox" checked={Boolean(recordDraft.feather_pull)} onChange={event => updateRecord('feather_pull', event.target.checked)} />Feather Pull</label><label style={styles.check}><input type="checkbox" checked={Boolean(recordDraft.blood_sample)} onChange={event => updateRecord('blood_sample', event.target.checked)} />Blood Sample</label><TextField label="Notes"><textarea rows={2} value={text(recordDraft.notes)} onChange={event => updateRecord('notes', event.target.value)} /></TextField></FormSection>
        <p style={styles.hint}>Every field is optional and soft warnings do not block saving. Empty amended fields are recorded as explicit clears.</p><button disabled={saving || (bandMode === 'managed' && !managedBandId)}>Save offline</button>{editingRecordId && <button type="button" onClick={resetRecord}>Cancel amendment</button>}
      </form></>}
      <EntityList title="Banding Records" entities={entities.filter(entity => entity.kind === 'banding-record' && (!sessionId || text(entity.fields.session_id) === sessionId))} detail={entity => recordLabel(entity, bands)} onDeactivate={entity => void perform(() => decide({ kind: entity.active ? 'deactivate' : 'reactivate', entity_kind: 'banding-record', entity_id: entity.id }))} onCorrect={correctRecord} />
      <ConflictPanels projection={projection} bands={bands} onCorrect={correctRecord} />
    </>}
    {tab === 'inventory' && <><form style={styles.card} onSubmit={receiveBand}><h2>{editingBandId ? 'Amend Band' : 'Receive Band'}</h2><label>Band number<input value={bandNumber} onChange={event => setBandNumber(event.target.value)} /></label><p style={styles.hint}>Band number is optional; enter it when available so duplicate-number conflicts can be surfaced.</p><button disabled={saving}>Save offline</button>{editingBandId && <button type="button" onClick={() => { setEditingBandId(''); setBandNumber('') }}>Cancel amendment</button>}</form><EntityList title="Inventory" entities={inventoryBands} detail={entity => text(entity.fields.band_number) || entity.id} onCorrect={id => { const entity = projection.entities.get(id); if (entity) beginConfigurationEdit(entity) }} onDeactivate={entity => void perform(() => decide({ kind: entity.active ? 'deactivate' : 'reactivate', entity_kind: 'band', entity_id: entity.id }))} /><ConflictPanels projection={projection} bands={bands} onCorrect={correctRecord} /></>}
    {tab === 'configuration' && (access.role === 'admin' ? <>
      <form style={styles.card} onSubmit={createStation}><h2>{editingStationId ? 'Amend Station' : 'Station'}</h2><label>Name<input value={stationName} onChange={event => setStationName(event.target.value)} /></label><button disabled={saving}>Save offline</button></form>
      <form style={styles.card} onSubmit={createNet}><h2>{editingNetId ? 'Amend Net' : 'Net'}</h2><SelectField label="Station" value={netStationId} onChange={setNetStationId} options={stations.map(station => ({ code: station.id, label: text(station.fields.name) || station.id }))} /><label>Label<input value={netLabel} onChange={event => setNetLabel(event.target.value)} /></label><button disabled={saving || !netStationId}>Save offline</button></form>
      <form style={styles.card} onSubmit={createPerson}><h2>{editingPersonId ? 'Amend Roster Person' : 'Roster Person'}</h2><label>Name<input value={personName} onChange={event => setPersonName(event.target.value)} /></label><label>Initials<input value={personInitials} onChange={event => setPersonInitials(event.target.value)} /></label><button disabled={saving}>Save offline</button></form>
      <form style={styles.card} onSubmit={createBander}><h2>{editingBanderId ? 'Amend Bander role' : 'Bander role'}</h2><SelectField label="Person" value={banderPersonId} onChange={setBanderPersonId} options={people.map(person => ({ code: person.id, label: text(person.fields.name) || person.id }))} /><SelectField label="Role" value={banderRole} onChange={setBanderRole} options={Object.keys(ROLE_ORDER).map(role => ({ code: role, label: role }))} /><button disabled={saving || !banderPersonId}>Save offline</button></form>
      <form style={styles.card} onSubmit={linkPerson}><h2>User Account-to-Person link</h2><label>User Account ID (blank means my account)<input value={linkUserAccountId} onChange={event => setLinkUserAccountId(event.target.value)} /></label><SelectField label="Person (blank unlinks)" value={linkPersonId} onChange={setLinkPersonId} options={people.map(person => ({ code: person.id, label: text(person.fields.name) || person.id }))} /><button disabled={saving}>Save link offline</button></form>
      <EntityList title="Stations" entities={entities.filter(entity => entity.kind === 'station')} detail={entity => text(entity.fields.name) || entity.id} onCorrect={id => { const entity = projection.entities.get(id); if (entity) beginConfigurationEdit(entity) }} onDeactivate={entity => void perform(() => decide({ kind: entity.active ? 'deactivate' : 'reactivate', entity_kind: 'station', entity_id: entity.id }))} />
      <EntityList title="Nets" entities={entities.filter(entity => entity.kind === 'net')} detail={entity => `${text(entity.fields.label) || entity.id} — ${stationNameFor(text(entity.fields.station_id), stations)}`} onCorrect={id => { const entity = projection.entities.get(id); if (entity) beginConfigurationEdit(entity) }} onDeactivate={entity => void perform(() => decide({ kind: entity.active ? 'deactivate' : 'reactivate', entity_kind: 'net', entity_id: entity.id }))} />
      <EntityList title="Roster" entities={entities.filter(entity => entity.kind === 'person')} detail={entity => `${text(entity.fields.name) || entity.id} — ${text(entity.fields.initials)}`} onCorrect={id => { const entity = projection.entities.get(id); if (entity) beginConfigurationEdit(entity) }} onDeactivate={entity => void perform(() => decide({ kind: entity.active ? 'deactivate' : 'reactivate', entity_kind: 'person', entity_id: entity.id }))} />
      <EntityList title="Banders" entities={entities.filter(entity => entity.kind === 'bander')} detail={entity => banderLabel(entity, people)} onCorrect={id => { const entity = projection.entities.get(id); if (entity) beginConfigurationEdit(entity) }} onDeactivate={entity => void perform(() => decide({ kind: entity.active ? 'deactivate' : 'reactivate', entity_kind: 'bander', entity_id: entity.id }))} />
    </> : <p style={styles.warning}>An Admin configures Stations, Nets, and the roster. Membership changes remain in the Provisioner CLI.</p>)}
  </main>
}

function WeatherSection({ title, draft, prefix, update }: { title: string; draft: Draft; prefix: 'weather_open' | 'weather_close'; update: (key: string, value: string) => void }) { return <details style={styles.details}><summary>{title} (optional)</summary><FormRow><NumberField label="Temperature °C" field={`${prefix}_temp`} draft={draft} update={update} /><NumberField label="Wind (0–12)" field={`${prefix}_wind`} draft={draft} update={update} /></FormRow><FormRow><NumberField label="Cloud cover %" field={`${prefix}_cloud`} draft={draft} update={update} /><TextField label="Precipitation"><input value={text(draft[`${prefix}_precip`])} onChange={event => update(`${prefix}_precip`, event.target.value)} placeholder="Clear, fog, rain…" /></TextField></FormRow></details> }
function CodeGrid({ draft, update }: { draft: Draft; update: (key: string, value: string | boolean) => void }) { const fields = [['molt_limits_p_covs', 'P Covs'], ['molt_limits_s_covs', 'G Covs'], ['molt_limits_alula', 'Alula'], ['molt_limits_pp', 'PP'], ['molt_limits_ss', 'SS'], ['molt_limits_tert', 'Tert'], ['molt_limits_rec', 'Rec'], ['molt_limits_body_plum', 'Body Plum'], ['molt_limits_non_feather', 'Non-Feather']] as const; return <div style={styles.grid}>{fields.map(([field, label]) => <SelectField key={field} label={label} value={text(draft[field])} onChange={value => update(field, value)} options={MOLT_LIMITS_CODES} />)}</div> }
function NumberField({ label, field, draft, update, step = '1' }: { label: string; field: string; draft: Draft; update: (key: string, value: string) => void; step?: string }) { return <TextField label={label}><input type="number" step={step} value={text(draft[field])} onChange={event => update(field, event.target.value)} /></TextField> }
function TextField({ label, children }: { label: string; children: React.ReactNode }) { return <label style={styles.field}><span>{label}</span>{children}</label> }
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: readonly Code[] }) { return <TextField label={label}><select value={value} onChange={event => onChange(event.target.value)}><option value="">—</option>{options.map(option => <option key={option.code} value={option.code}>{option.code === option.label ? option.label : `${option.code} — ${option.label}`}</option>)}</select></TextField> }
function FormRow({ children }: { children: React.ReactNode }) { return <div style={styles.grid}>{children}</div> }
function FormSection({ title, children }: { title: string; children: React.ReactNode }) { return <section style={styles.section}><h3>{title}</h3>{children}</section> }
function EntityList({ title, entities, detail, onDeactivate, onCorrect }: { title: string; entities: readonly OperationalEntity[]; detail: (entity: OperationalEntity) => string; onDeactivate: (entity: OperationalEntity) => void; onCorrect?: (id: string) => void }) { return <section style={styles.card}><h2>{title}</h2>{entities.length === 0 ? <p>None yet.</p> : entities.map(entity => <div key={entity.id} style={styles.row}><span>{detail(entity)}{entity.active ? '' : ' (inactive)'}</span><span style={styles.actions}>{onCorrect && entity.active && <button type="button" onClick={() => onCorrect(entity.id)}>Correct</button>}<button type="button" onClick={() => onDeactivate(entity)}>{entity.active ? 'Deactivate' : 'Reactivate'}</button></span></div>)}</section> }
function ConflictPanels({ projection, bands, onCorrect }: { projection: ReturnType<typeof projectOperationalEvents>; bands: readonly OperationalEntity[]; onCorrect: (id: string) => void }) { return <>{projection.band_number_conflicts.map(conflict => <section style={styles.warning} key={`number-${conflict.band_number}`}><strong>Band-number conflict: {conflict.band_number}</strong><p>Both offline inventory facts remain. A Contributor can deactivate or amend the incorrect inventory Band; no history is deleted.</p>{conflict.band_ids.map(id => <span key={id} style={styles.actions}>{text(bands.find(band => band.id === id)?.fields.band_number) || id}</span>)}</section>)}{projection.band_allocation_conflicts.map(conflict => <section style={styles.warning} key={`allocation-${conflict.band_id}`}><strong>Band allocation conflict: {text(bands.find(band => band.id === conflict.band_id)?.fields.band_number) || conflict.band_id}</strong><p>Both new-deployment facts remain. Correct one record with an amendment or deactivate it; a recapture does not conflict.</p>{conflict.record_ids.map(id => <button type="button" key={id} onClick={() => onCorrect(id)}>Correct record {id.slice(0, 8)}</button>)}</section>)}</> }
function currentBandSelection(mode: BandMode, foreign: string, managedId: string, bands: readonly OperationalEntity[]) { if (mode === 'foreign') return { kind: 'foreign', band_number: foreign.trim() }; if (mode === 'managed') { const band = bands.find(item => item.id === managedId); return { kind: 'managed', band_id: managedId, band_number: text(band?.fields.band_number) } } return { kind: 'unbanded' } }
function draftFrom(fields: Record<string, unknown>, keys: readonly string[]): Draft { return Object.fromEntries(keys.map(key => [key, BOOLEAN_KEYS.has(key) ? Boolean(fields[key]) : text(fields[key])])) }
function eventFields(draft: Draft, keys: readonly string[]): Record<string, unknown> { return Object.fromEntries(keys.map(key => { const value = draft[key]; if (BOOLEAN_KEYS.has(key)) return [key, Boolean(value)]; if (text(value) === '') return [key, null]; return [key, NUMBER_KEYS.has(key) ? Number(value) : value] })) }
function changedFields(current: Record<string, unknown>, candidate: Record<string, unknown>): Record<string, unknown> { return Object.fromEntries(Object.entries(candidate).filter(([key, value]) => JSON.stringify(current[key] ?? null) !== JSON.stringify(value))) }
function compact(fields: Record<string, unknown>): Record<string, unknown> { return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== null && value !== undefined && value !== '')) }
function text(value: unknown): string { return value === undefined || value === null ? '' : String(value) }
function today(): string { return new Date().toISOString().slice(0, 10) }
function isNewDeployment(value: unknown): boolean { return value === '1' || value === 'N' }
function managedBandIdFrom(record: OperationalEntity): string { const selection = record.fields.band_selection as { kind?: string; band_id?: string } | undefined; return selection?.kind === 'managed' ? selection.band_id ?? '' : '' }
function stationNameFor(id: string, stations: readonly OperationalEntity[]): string { return text(stations.find(station => station.id === id)?.fields.name) || id || 'Unresolved Station' }
function sessionLabel(session: OperationalEntity, stations: readonly OperationalEntity[]): string { return [text(session.fields.session_date) || 'Date not entered', stationNameFor(text(session.fields.station_id), stations)].filter(Boolean).join(' — ') }
function banderLabel(bander: OperationalEntity, people: readonly OperationalEntity[]): string { const person = people.find(item => item.id === bander.fields.person_id); return `${text(person?.fields.initials) || '—'} — ${text(person?.fields.name) || 'Unresolved Person'} (${text(bander.fields.role) || 'Bander'})` }
function recordLabel(record: OperationalEntity, bands: readonly OperationalEntity[]): string { const selection = record.fields.band_selection as { kind?: string; band_number?: string; band_id?: string } | undefined; const band = selection?.kind === 'managed' ? text(bands.find(item => item.id === selection.band_id)?.fields.band_number) || 'Unresolved managed Band' : selection?.kind === 'foreign' ? selection.band_number || 'Foreign Band' : selection?.kind === 'unbanded' ? 'Unbanded' : ''; return [text(record.fields.species_code) || 'Species not entered', band, text(record.fields.capture_code) === 'R' ? 'recap' : ''].filter(Boolean).join(' · ') }
function statusText(status: SyncStatus) { return status.kind === 'syncing' ? 'Syncing…' : status.kind === 'offline' ? `Offline — changes stay on this device (${status.message})` : status.kind === 'attention' ? `${status.rejected} Events need attention` : status.last_synced_at ? `Synced ${new Date(status.last_synced_at).toLocaleTimeString()}` : 'Ready to sync' }

const styles: Record<string, React.CSSProperties> = { page: { minHeight: '100dvh', padding: '1rem 1.25rem 3rem', background: '#f5f5f5', color: '#1b4332', display: 'flex', flexDirection: 'column', gap: '1rem' }, status: { display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.35rem 1rem', alignItems: 'center', background: '#e8f5e9', borderRadius: 10, padding: '0.8rem' }, tabs: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }, tab: { minHeight: 40, textTransform: 'capitalize' }, selected: { minHeight: 40, textTransform: 'capitalize', background: '#2d6a4f', color: '#fff' }, card: { display: 'flex', flexDirection: 'column', gap: '0.7rem', padding: '1rem', background: '#fff', borderRadius: 10 }, row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.6rem', borderTop: '1px solid #ddd' }, actions: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }, grid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.6rem' }, field: { display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 600 }, section: { borderTop: '1px solid #d8f3dc', paddingTop: '0.8rem' }, crew: { display: 'flex', flexDirection: 'column', gap: '0.35rem', borderTop: '1px solid #d8f3dc', paddingTop: '0.7rem' }, details: { padding: '0.4rem 0', color: '#1b4332' }, check: { display: 'flex', alignItems: 'center', gap: '0.5rem' }, hint: { margin: 0, fontSize: '0.85rem', color: '#555' }, error: { margin: 0, padding: '0.75rem', background: '#f8d7da', color: '#721c24', borderRadius: 8 }, warning: { margin: 0, padding: '0.75rem', background: '#fff3cd', color: '#5c4400', borderRadius: 8 } }
