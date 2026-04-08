import { useState, useEffect } from 'react'
import { labelStyle, inputStyle, nowBtnStyle, btnStyle } from '../styles/theme'
import { Card } from '../components/Card'
import type { BirdRecord, Session, SessionNetLog, Net, Location, Bander, Person, Protocol, Band } from '../types'
import { getRecordsBySession, deleteRecord, getLocations, getBanders, getPeople, saveSession, deleteSession, getSessionBanderLogs, replaceSessionBanderLogs, getSessionNetLogs, saveSessionNetLog, deleteSessionNetLog, getNetsByLocation } from '../db'
import BirdRecordForm from './BirdRecordForm'
import { PROTOCOL_CODES, isNewBanding } from '../data/codes'
import PageHeader from '../components/PageHeader'
import Collapsible from '../components/Collapsible'
import SearchableSelect from '../components/SearchableSelect'

const PRECIP_SUGGESTIONS = [
  { code: 'clear', label: 'Clear' },
  { code: 'fog', label: 'Fog' },
  { code: 'thick fog', label: 'Thick Fog' },
  { code: 'drizzle', label: 'Drizzle' },
  { code: 'rain', label: 'Rain' },
  { code: 'snow', label: 'Snow' },
]

interface Props {
  session: Session
  onBack: () => void
  onHome: () => void
  onSessionDeleted: () => void
  onSessionUpdated: (session: Session) => void
  onViewBandHistory?: (band: Band) => void
}

type View = { mode: 'list' } | { mode: 'form'; record?: BirdRecord } | { mode: 'edit-session' } | { mode: 'net-effort' }

interface BanderWithPerson {
  bander: Bander
  person: Person
}

export default function SessionView({ session, onBack, onHome, onSessionDeleted, onSessionUpdated, onViewBandHistory }: Props) {
  const [records, setRecords] = useState<BirdRecord[]>([])
  const [view, setView] = useState<View>({ mode: 'list' })
  const [locations, setLocations] = useState<Location[]>([])
  const [banderOptions, setBanderOptions] = useState<BanderWithPerson[]>([])
  const [sessionBanderIds, setSessionBanderIds] = useState<Set<string>>(new Set())
  const [netLogs, setNetLogs] = useState<SessionNetLog[]>([])
  const [nets, setNets] = useState<Net[]>([])

  // Edit session form state
  const [editLocationId, setEditLocationId] = useState(session.locationId)
  const [editDate, setEditDate] = useState(session.date)
  const [editProtocol, setEditProtocol] = useState<Protocol | ''>(session.protocol ?? '')
  const [editMapsPeriod, setEditMapsPeriod] = useState(session.mapsPeriod?.toString() ?? '')
  const [editMasterBanderId, setEditMasterBanderId] = useState(session.masterBanderId ?? '')
  const [editOpenTime, setEditOpenTime] = useState(session.openTime ?? '')
  const [editCloseTime, setEditCloseTime] = useState(session.closeTime ?? '')
  const [editNotes, setEditNotes] = useState(session.notes ?? '')
  const [editParticipants, setEditParticipants] = useState<Set<string>>(new Set())
  // Weather edit state
  const [editWeatherOpenTemp, setEditWeatherOpenTemp] = useState(session.weatherOpenTemp?.toString() ?? '')
  const [editWeatherOpenWind, setEditWeatherOpenWind] = useState(session.weatherOpenWind?.toString() ?? '')
  const [editWeatherOpenCloud, setEditWeatherOpenCloud] = useState(session.weatherOpenCloud?.toString() ?? '')
  const [editWeatherOpenPrecip, setEditWeatherOpenPrecip] = useState(session.weatherOpenPrecip ?? '')
  const [editWeatherCloseTemp, setEditWeatherCloseTemp] = useState(session.weatherCloseTemp?.toString() ?? '')
  const [editWeatherCloseWind, setEditWeatherCloseWind] = useState(session.weatherCloseWind?.toString() ?? '')
  const [editWeatherCloseCloud, setEditWeatherCloseCloud] = useState(session.weatherCloseCloud?.toString() ?? '')
  const [editWeatherClosePrecip, setEditWeatherClosePrecip] = useState(session.weatherClosePrecip ?? '')


  async function loadRecords() {
    const r = await getRecordsBySession(session.id)
    setRecords(r.sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
  }

  async function loadReferenceData(locationIdOverride?: string) {
    const locId = locationIdOverride ?? session.locationId
    const [locs, banders, people, banderLogs, snLogs] = await Promise.all([
      getLocations(),
      getBanders(),
      getPeople(),
      getSessionBanderLogs(session.id),
      getSessionNetLogs(session.id),
    ])
    setLocations(locs)

    const roleOrder: Record<string, number> = { 'Master Bander': 0, 'Sub-permittee': 1, 'Bander': 2, 'Trainee': 3 }
    const opts = banders
      .map(b => ({ bander: b, person: people.find(p => p.id === b.personId)! }))
      .filter(o => o.person?.active)
      .sort((a, b) => (roleOrder[a.bander.role] ?? 9) - (roleOrder[b.bander.role] ?? 9) || a.person.name.localeCompare(b.person.name))
    setBanderOptions(opts)

    const ids = new Set(banderLogs.map(bl => bl.banderId))
    setSessionBanderIds(ids)
    setEditParticipants(ids)

    setNetLogs(snLogs)
    // Load nets for this location (use override when location just changed)
    const locationNets = await getNetsByLocation(locId)
    setNets(locationNets)
  }

  useEffect(() => {
    loadRecords()
    loadReferenceData()
  }, [session.id])

  function locationCode(locId: string): string {
    return locations.find(l => l.id === locId)?.banderLocationId ?? ''
  }

  function banderInitials(banderId: string): string {
    return banderOptions.find(o => o.bander.id === banderId)?.person.initials ?? ''
  }

  async function handleDeleteSession() {
    const recCount = records.length
    const blCount = sessionBanderIds.size

    let msg = `Delete session ${locationCode(session.locationId)} ${session.date}?\n\n`
    if (recCount > 0 || blCount > 0) {
      msg += 'This will also delete:\n'
      if (recCount > 0) msg += `• ${recCount} banding record${recCount !== 1 ? 's' : ''}\n`
      if (blCount > 0) msg += `• ${blCount} bander log entr${blCount !== 1 ? 'ies' : 'y'}\n`
      msg += '\n'
    }
    msg += 'This cannot be undone.'

    if (!confirm(msg)) return
    await deleteSession(session.id)
    onSessionDeleted()
  }

  function startEditSession() {
    setEditLocationId(session.locationId)
    setEditDate(session.date)
    setEditProtocol(session.protocol ?? '')
    setEditMapsPeriod(session.mapsPeriod?.toString() ?? '')
    setEditMasterBanderId(session.masterBanderId ?? '')
    setEditOpenTime(session.openTime ?? '')
    setEditCloseTime(session.closeTime ?? '')
    setEditNotes(session.notes ?? '')
    setEditWeatherOpenTemp(session.weatherOpenTemp?.toString() ?? '')
    setEditWeatherOpenWind(session.weatherOpenWind?.toString() ?? '')
    setEditWeatherOpenCloud(session.weatherOpenCloud?.toString() ?? '')
    setEditWeatherOpenPrecip(session.weatherOpenPrecip ?? '')
    setEditWeatherCloseTemp(session.weatherCloseTemp?.toString() ?? '')
    setEditWeatherCloseWind(session.weatherCloseWind?.toString() ?? '')
    setEditWeatherCloseCloud(session.weatherCloseCloud?.toString() ?? '')
    setEditWeatherClosePrecip(session.weatherClosePrecip ?? '')
    setEditParticipants(new Set(sessionBanderIds))
    setView({ mode: 'edit-session' })
  }

  async function saveEditSession() {
    const updated: Session = {
      ...session,
      locationId: editLocationId,
      date: editDate,
      protocol: editProtocol || undefined,
      mapsPeriod: editMapsPeriod ? parseInt(editMapsPeriod) : undefined,
      masterBanderId: editMasterBanderId || undefined,
      openTime: editOpenTime || undefined,
      closeTime: editCloseTime || undefined,
      weatherOpenTemp: editWeatherOpenTemp ? parseFloat(editWeatherOpenTemp) : undefined,
      weatherOpenWind: editWeatherOpenWind ? parseInt(editWeatherOpenWind) : undefined,
      weatherOpenCloud: editWeatherOpenCloud ? parseInt(editWeatherOpenCloud) : undefined,
      weatherOpenPrecip: editWeatherOpenPrecip || undefined,
      weatherCloseTemp: editWeatherCloseTemp ? parseFloat(editWeatherCloseTemp) : undefined,
      weatherCloseWind: editWeatherCloseWind ? parseInt(editWeatherCloseWind) : undefined,
      weatherCloseCloud: editWeatherCloseCloud ? parseInt(editWeatherCloseCloud) : undefined,
      weatherClosePrecip: editWeatherClosePrecip || undefined,
      notes: editNotes || undefined,
      updatedAt: new Date().toISOString(),
    }
    await saveSession(updated)
    await replaceSessionBanderLogs(session.id, Array.from(editParticipants))
    onSessionUpdated(updated)
    await loadReferenceData(editLocationId)
    setView({ mode: 'list' })
  }

  function toggleEditParticipant(banderId: string) {
    setEditParticipants(prev => {
      const next = new Set(prev)
      if (next.has(banderId)) next.delete(banderId)
      else next.add(banderId)
      return next
    })
  }

  function nowTime(): string {
    const d = new Date()
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  if (view.mode === 'net-effort') {
    return (
      <NetEffortView
        session={session}
        netLogs={netLogs}
        nets={nets}
        onBack={() => { loadReferenceData(); setView({ mode: 'edit-session' }) }}
        onHome={onHome}
        onSave={async (log) => { await saveSessionNetLog(log); await loadReferenceData() }}
        onAdd={async (netId) => {
          const now = new Date().toISOString()
          await saveSessionNetLog({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            sessionId: session.id,
            netId,
            openTime: session.openTime,
            closeTime: session.closeTime,
            createdAt: now,
            updatedAt: now,
          })
          await loadReferenceData()
        }}
        onRemove={async (logId) => {
          await deleteSessionNetLog(logId)
          await loadReferenceData()
        }}
      />
    )
  }

  if (view.mode === 'form') {
    const recordSequence = view.record
      ? records.findIndex(r => r.id === view.record!.id) + 1
      : records.length + 1
    return (
      <BirdRecordForm
        session={session}
        record={view.record}
        recordSequence={recordSequence}
        onSaved={() => { loadRecords(); setView({ mode: 'list' }) }}
        onCancel={() => setView({ mode: 'list' })}
        onHome={onHome}
        onViewBandHistory={onViewBandHistory}
      />
    )
  }

  if (view.mode === 'edit-session') {
    return (
      <div style={{ padding: '1rem', maxWidth: 500, margin: '0 auto' }}>
        <PageHeader title="Edit Session" onBack={() => setView({ mode: 'list' })} backLabel="← Back" onHome={onHome} />

        <button
          type="button"
          onClick={() => setView({ mode: 'net-effort' })}
          style={{ ...secondaryBtnStyle, width: '100%', marginBottom: '0.75rem', textAlign: 'center' }}
        >
          Manage Nets{netLogs.length > 0 ? ` (${netLogs.length} nets)` : ''}
        </button>

        <Card>
          <label style={labelStyle}>Location</label>
          <select value={editLocationId} onChange={e => setEditLocationId(e.target.value)} style={inputStyle}>
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>{loc.banderLocationId} — {loc.name}</option>
            ))}
          </select>

          <label style={labelStyle}>Date</label>
          <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={inputStyle} />

          <label style={labelStyle}>Protocol</label>
          <select value={editProtocol} onChange={e => setEditProtocol(e.target.value as Protocol | '')} style={inputStyle}>
            <option value="">—</option>
            {PROTOCOL_CODES.map(p => (
              <option key={p.code} value={p.code}>{p.label}</option>
            ))}
          </select>

          {editProtocol === 'MAPS' && (
            <>
              <label style={labelStyle}>MAPS Period (1-10)</label>
              <input type="number" min="1" max="10" value={editMapsPeriod} onChange={e => setEditMapsPeriod(e.target.value)} style={inputStyle} />
            </>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label style={labelStyle}>Open Time</label>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <input type="time" value={editOpenTime} onChange={e => setEditOpenTime(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <button type="button" onClick={() => setEditOpenTime(nowTime())} style={nowBtnStyle}>Now</button>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Close Time</label>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <input type="time" value={editCloseTime} onChange={e => setEditCloseTime(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <button type="button" onClick={() => setEditCloseTime(nowTime())} style={nowBtnStyle}>Now</button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <Collapsible title="Weather @ Open" defaultOpen={!!session.weatherOpenTemp || !!session.weatherOpenWind || !!session.weatherOpenCloud || !!session.weatherOpenPrecip}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={labelStyle}>Temp (°C)</label>
                  <input type="number" step="0.1" value={editWeatherOpenTemp} onChange={e => setEditWeatherOpenTemp(e.target.value)} style={inputStyle} placeholder="e.g. 15" />
                </div>
                <div>
                  <label style={labelStyle}>Wind (Beaufort 0-12)</label>
                  <input type="number" min="0" max="12" value={editWeatherOpenWind} onChange={e => setEditWeatherOpenWind(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Cloud Cover (%)</label>
                  <input type="number" min="0" max="100" value={editWeatherOpenCloud} onChange={e => setEditWeatherOpenCloud(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Precipitation</label>
                  <SearchableSelect options={PRECIP_SUGGESTIONS} value={editWeatherOpenPrecip} onChange={setEditWeatherOpenPrecip} placeholder="Type or select..." allowFreeText />
                </div>
              </div>
            </Collapsible>
          </div>

          <div style={{ marginTop: '0.25rem' }}>
            <Collapsible title="Weather @ Close" defaultOpen={!!session.weatherCloseTemp || !!session.weatherCloseWind || !!session.weatherCloseCloud || !!session.weatherClosePrecip}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={labelStyle}>Temp (°C)</label>
                  <input type="number" step="0.1" value={editWeatherCloseTemp} onChange={e => setEditWeatherCloseTemp(e.target.value)} style={inputStyle} placeholder="e.g. 22" />
                </div>
                <div>
                  <label style={labelStyle}>Wind (Beaufort 0-12)</label>
                  <input type="number" min="0" max="12" value={editWeatherCloseWind} onChange={e => setEditWeatherCloseWind(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Cloud Cover (%)</label>
                  <input type="number" min="0" max="100" value={editWeatherCloseCloud} onChange={e => setEditWeatherCloseCloud(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Precipitation</label>
                  <SearchableSelect options={PRECIP_SUGGESTIONS} value={editWeatherClosePrecip} onChange={setEditWeatherClosePrecip} placeholder="Type or select..." allowFreeText />
                </div>
              </div>
            </Collapsible>
          </div>

          <label style={labelStyle}>Master Bander</label>
          <select value={editMasterBanderId} onChange={e => setEditMasterBanderId(e.target.value)} style={inputStyle}>
            <option value="">—</option>
            {banderOptions.map(o => (
              <option key={o.bander.id} value={o.bander.id}>{o.person.initials} — {o.person.name} ({o.bander.role})</option>
            ))}
          </select>

          <label style={labelStyle}>Session Participants</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.5rem' }}>
            {banderOptions.map(o => (
              <label key={o.bander.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={editParticipants.has(o.bander.id)} onChange={() => toggleEditParticipant(o.bander.id)} />
                {o.person.initials} — {o.person.name} ({o.bander.role})
              </label>
            ))}
          </div>

          <label style={labelStyle}>Notes</label>
          <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} placeholder="Optional session notes" style={{ ...inputStyle, resize: 'vertical' }} />

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button onClick={saveEditSession} style={btnStyle('#2d6a4f')}>Save</button>
            <button onClick={() => setView({ mode: 'list' })} style={btnStyle('#888')}>Cancel</button>
          </div>
        </Card>
      </div>
    )
  }

  // Summary stats
  const newCount = records.filter(r => isNewBanding(r.bbpCode)).length
  const recapCount = records.filter(r => r.bbpCode === 'R').length
  const unbandedCount = records.filter(r => r.bbpCode === 'U').length

  const participantInitials = banderOptions
    .filter(o => sessionBanderIds.has(o.bander.id))
    .map(o => o.person.initials)
    .join(', ')

  return (
    <div style={{ padding: '1rem', maxWidth: 500, margin: '0 auto' }}>
      <PageHeader
        title={`${locationCode(session.locationId)} · ${session.date}`}
        onBack={onBack}
        backLabel="← Sessions"
        onHome={onHome}
      />

      {/* Session metadata summary */}
      <div style={metaStyle}>
        {session.protocol && (
          <span>{session.protocol}{session.mapsPeriod ? ` ${session.mapsPeriod}` : ''}</span>
        )}
        {(session.openTime || session.closeTime) && (
          <span>{session.openTime ?? '?'}–{session.closeTime ?? '?'}</span>
        )}
        {session.masterBanderId && <span>Master: {banderInitials(session.masterBanderId)}</span>}
        {participantInitials && <span>Banders: {participantInitials}</span>}
      </div>

      {records.length > 0 && (
        <div style={statsStyle}>
          <span>{records.length} record{records.length !== 1 ? 's' : ''}</span>
          {newCount > 0 && <span style={{ color: '#2d6a4f' }}>{newCount} new</span>}
          {recapCount > 0 && <span style={{ color: '#6c757d' }}>{recapCount} recap</span>}
          {unbandedCount > 0 && <span style={{ color: '#856404' }}>{unbandedCount} unbanded</span>}
        </div>
      )}

      {/* Weather summary */}
      {(session.weatherOpenTemp != null || session.weatherCloseTemp != null) && (
        <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '0.5rem' }}>
          {session.weatherOpenTemp != null && (
            <span>Open: {session.weatherOpenTemp}°C{session.weatherOpenWind != null ? ` / Wind ${session.weatherOpenWind}` : ''}{session.weatherOpenCloud != null ? ` / ${session.weatherOpenCloud}%` : ''}{session.weatherOpenPrecip ? ` / ${session.weatherOpenPrecip}` : ''}</span>
          )}
          {session.weatherOpenTemp != null && session.weatherCloseTemp != null && <span> · </span>}
          {session.weatherCloseTemp != null && (
            <span>Close: {session.weatherCloseTemp}°C{session.weatherCloseWind != null ? ` / Wind ${session.weatherCloseWind}` : ''}{session.weatherCloseCloud != null ? ` / ${session.weatherCloseCloud}%` : ''}{session.weatherClosePrecip ? ` / ${session.weatherClosePrecip}` : ''}</span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => setView({ mode: 'form' })} style={btnStyle('#2d6a4f')}>
          + New Bird Record
        </button>
        <button onClick={startEditSession} style={secondaryBtnStyle}>
          Edit Session
        </button>

        <button onClick={handleDeleteSession} style={deleteBtnStyle}>
          Delete Session
        </button>
      </div>

      {session.notes && (
        <div style={notesStyle}>
          <strong style={{ fontSize: '0.8rem' }}>Notes:</strong> {session.notes}
        </div>
      )}

      <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
        {records.map(r => (
          <li key={r.id} style={recordRowStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{r.speciesCode ?? '—'}</strong>
                {r.bandNumber && <span style={{ color: '#555', marginLeft: '0.5rem', fontSize: '0.85rem' }}>{r.bandNumber}</span>}
                {r.bbpCode === 'R' && <span style={recapChipStyle}>recap</span>}
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

/** Calculate net-hours between two HH:mm strings. Returns null if either is missing. */
export function calcNetHours(openTime?: string, closeTime?: string): number | null {
  if (!openTime || !closeTime) return null
  const [oh, om] = openTime.split(':').map(Number)
  const [ch, cm] = closeTime.split(':').map(Number)
  if (oh == null || om == null || ch == null || cm == null) return null
  const openMinutes = oh * 60 + om
  const closeMinutes = ch * 60 + cm
  if (closeMinutes <= openMinutes) return null
  return Math.round(((closeMinutes - openMinutes) / 60) * 100) / 100
}

interface NetEffortProps {
  session: Session
  netLogs: SessionNetLog[]
  nets: Net[]
  onBack: () => void
  onHome: () => void
  onSave: (log: SessionNetLog) => Promise<void>
  onAdd: (netId: string) => Promise<void>
  onRemove: (logId: string) => Promise<void>
}

function NetEffortView({ session, netLogs, nets, onBack, onHome, onSave, onAdd, onRemove }: NetEffortProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState('')
  const [editClose, setEditClose] = useState('')
  const [editRemarks, setEditRemarks] = useState('')

  // Nets that have a log entry
  const loggedNetIds = new Set(netLogs.map(l => l.netId))
  // Nets available to add (active nets at location without a log)
  const availableNets = nets
    .filter(n => n.active !== false && !loggedNetIds.has(n.id))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))

  // Sort net logs by net label
  const sorted = [...netLogs].sort((a, b) => {
    const na = nets.find(n => n.id === a.netId)
    const nb = nets.find(n => n.id === b.netId)
    const la = na?.label ?? ''
    const lb = nb?.label ?? ''
    return la.localeCompare(lb, undefined, { numeric: true })
  })

  const totalHours = sorted.reduce((sum, log) => {
    const h = calcNetHours(log.openTime, log.closeTime)
    return sum + (h ?? 0)
  }, 0)

  function startEdit(log: SessionNetLog) {
    setEditingId(log.id)
    setEditOpen(log.openTime ?? '')
    setEditClose(log.closeTime ?? '')
    setEditRemarks(log.remarks ?? '')
  }

  async function saveEdit(log: SessionNetLog) {
    await onSave({
      ...log,
      openTime: editOpen || undefined,
      closeTime: editClose || undefined,
      remarks: editRemarks || undefined,
      updatedAt: new Date().toISOString(),
    })
    setEditingId(null)
  }

  function nowTime(): string {
    const d = new Date()
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  return (
    <div style={{ padding: '1rem', maxWidth: 500, margin: '0 auto' }}>
      <PageHeader title="Manage Nets" onBack={onBack} backLabel="← Edit Session" onHome={onHome} />

      <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '0.75rem' }}>
        {session.openTime && session.closeTime
          ? `Session: ${session.openTime}–${session.closeTime}`
          : 'Session times not set'}
        {' · '}
        <strong>Total: {totalHours.toFixed(2)} net-hours</strong>
        {' · '}
        {sorted.length} net{sorted.length !== 1 ? 's' : ''}
      </div>

      {availableNets.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <select id="add-net-select" style={{ ...inputStyle, flex: 1, fontSize: '0.9rem', padding: '0.4rem' }}>
            {availableNets.map(n => (
              <option key={n.id} value={n.id}>Net {n.label}</option>
            ))}
          </select>
          <button
            onClick={() => {
              const sel = document.getElementById('add-net-select') as HTMLSelectElement
              if (sel?.value) onAdd(sel.value)
            }}
            style={smallSaveBtn}
          >
            + Add Net
          </button>
        </div>
      )}

      {sorted.length === 0 && (
        <div style={{ color: '#888', textAlign: 'center', marginTop: '2rem' }}>
          No net logs. Use the dropdown above to add nets, or net logs are auto-generated when a session is created.
        </div>
      )}

      {sorted.map(log => {
        const net = nets.find(n => n.id === log.netId)
        const netLabel = net?.label ?? '?'
        const hours = calcNetHours(log.openTime, log.closeTime)
        const isEditing = editingId === log.id

        if (isEditing) {
          return (
            <div key={log.id} style={{ ...netLogRowStyle, background: '#f5f5f5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontWeight: 600 }}>Net {netLabel}</span>
                <button onClick={() => { if (confirm(`Remove Net ${netLabel} from this session?`)) onRemove(log.id) }} style={removeNetBtnStyle}>Remove</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.4rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Open</label>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <input type="time" value={editOpen} onChange={e => setEditOpen(e.target.value)} style={{ ...inputStyle, fontSize: '0.9rem', padding: '0.3rem', flex: 1 }} />
                    <button type="button" onClick={() => setEditOpen(nowTime())} style={{ ...nowBtnStyle, padding: '0.3rem 0.4rem', fontSize: '0.7rem' }}>Now</button>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Close</label>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <input type="time" value={editClose} onChange={e => setEditClose(e.target.value)} style={{ ...inputStyle, fontSize: '0.9rem', padding: '0.3rem', flex: 1 }} />
                    <button type="button" onClick={() => setEditClose(nowTime())} style={{ ...nowBtnStyle, padding: '0.3rem 0.4rem', fontSize: '0.7rem' }}>Now</button>
                  </div>
                </div>
              </div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Remarks</label>
              <input type="text" value={editRemarks} onChange={e => setEditRemarks(e.target.value)} placeholder="Optional" style={{ ...inputStyle, fontSize: '0.9rem', padding: '0.3rem' }} />
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                <button onClick={() => saveEdit(log)} style={smallSaveBtn}>Save</button>
                <button onClick={() => setEditingId(null)} style={smallCancelBtn}>Cancel</button>
              </div>
            </div>
          )
        }

        return (
          <div key={log.id} style={netLogRowStyle} onClick={() => startEdit(log)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>Net {netLabel}</span>
              <span style={{ fontSize: '0.8rem', color: '#555' }}>
                {log.openTime ?? '—'}–{log.closeTime ?? '—'}
                {hours != null && <span style={{ marginLeft: '0.5rem', color: '#2d6a4f' }}>{hours.toFixed(2)}h</span>}
              </span>
            </div>
            {log.remarks && <div style={{ fontSize: '0.8rem', color: '#777', marginTop: '0.15rem' }}>{log.remarks}</div>}
          </div>
        )
      })}
    </div>
  )
}

const netLogRowStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: '0.6rem 0.75rem',
  marginBottom: '0.4rem',
  cursor: 'pointer',
}

const smallSaveBtn: React.CSSProperties = {
  background: '#2d6a4f',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  padding: '0.3rem 0.75rem',
  fontSize: '0.8rem',
  cursor: 'pointer',
}

const smallCancelBtn: React.CSSProperties = {
  background: '#888',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  padding: '0.3rem 0.75rem',
  fontSize: '0.8rem',
  cursor: 'pointer',
}

const removeNetBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #c44',
  borderRadius: 4,
  color: '#c44',
  fontSize: '0.7rem',
  padding: '0.15rem 0.4rem',
  cursor: 'pointer',
}

const recapChipStyle: React.CSSProperties = {
  display: 'inline-block',
  marginLeft: '0.4rem',
  padding: '0.1rem 0.4rem',
  fontSize: '0.7rem',
  fontWeight: 600,
  color: '#6c757d',
  background: '#e9ecef',
  borderRadius: 4,
  verticalAlign: 'middle',
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
  display: 'inline-block',
}

const deleteBtnStyle: React.CSSProperties = {
  background: '#fff',
  color: '#c0392b',
  border: '1.5px solid #c0392b',
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

const metaStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem',
  fontSize: '0.85rem',
  color: '#555',
  marginBottom: '0.75rem',
}

const statsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '1rem',
  fontSize: '0.85rem',
  fontWeight: 600,
  marginBottom: '0.75rem',
  padding: '0.5rem 0.75rem',
  background: '#f8f9fa',
  borderRadius: 6,
}

const notesStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  color: '#555',
  marginTop: '0.75rem',
  padding: '0.5rem 0.75rem',
  background: '#fff9db',
  borderRadius: 6,
  border: '1px solid #ffd43b',
}

