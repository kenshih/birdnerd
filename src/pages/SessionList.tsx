import { useState, useEffect } from 'react'
import type { Session, Location, Bander, Person, Protocol } from '../types'
import { getSessions, saveSession, getLocations, getBanders, getPeople, deleteSession, getRecordsBySession, getSessionBanderLogs, replaceSessionBanderLogs, generateSessionNetLogs } from '../db'
import { PROTOCOL_CODES } from '../data/codes'
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
  onSelectSession: (session: Session) => void
  onHome: () => void
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]!
}

function nowTime(): string {
  const d = new Date()
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

interface BanderWithPerson {
  bander: Bander
  person: Person
}

export default function SessionList({ onSelectSession, onHome }: Props) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [banderOptions, setBanderOptions] = useState<BanderWithPerson[]>([])
  const [recordCounts, setRecordCounts] = useState<Map<string, number>>(new Map())
  const [banderLogCounts, setBanderLogCounts] = useState<Map<string, number>>(new Map())
  const [showNew, setShowNew] = useState(false)

  // New session form state
  const [formLocationId, setFormLocationId] = useState('')
  const [formDate, setFormDate] = useState(todayISO())
  const [formProtocol, setFormProtocol] = useState<Protocol | ''>('')
  const [formMapsPeriod, setFormMapsPeriod] = useState('')
  const [formMasterBanderId, setFormMasterBanderId] = useState('')
  const [formOpenTime, setFormOpenTime] = useState('')
  const [formCloseTime, setFormCloseTime] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formParticipants, setFormParticipants] = useState<Set<string>>(new Set())
  // Weather @ Open
  const [formWeatherOpenTemp, setFormWeatherOpenTemp] = useState('')
  const [formWeatherOpenWind, setFormWeatherOpenWind] = useState('')
  const [formWeatherOpenCloud, setFormWeatherOpenCloud] = useState('')
  const [formWeatherOpenPrecip, setFormWeatherOpenPrecip] = useState('')
  // Weather @ Close
  const [formWeatherCloseTemp, setFormWeatherCloseTemp] = useState('')
  const [formWeatherCloseWind, setFormWeatherCloseWind] = useState('')
  const [formWeatherCloseCloud, setFormWeatherCloseCloud] = useState('')
  const [formWeatherClosePrecip, setFormWeatherClosePrecip] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [sess, locs, banders, people] = await Promise.all([
      getSessions(),
      getLocations(),
      getBanders(),
      getPeople(),
    ])
    setSessions(sess)
    setLocations(locs)
    if (locs.length > 0 && !formLocationId) setFormLocationId(locs[0]!.id)

    // Build bander options sorted: Master Bander first, then Sub-permittee, then others
    const roleOrder: Record<string, number> = { 'Master Bander': 0, 'Sub-permittee': 1, 'Bander': 2, 'Trainee': 3 }
    const opts = banders
      .map(b => ({ bander: b, person: people.find(p => p.id === b.personId)! }))
      .filter(o => o.person?.active)
      .sort((a, b) => (roleOrder[a.bander.role] ?? 9) - (roleOrder[b.bander.role] ?? 9) || a.person.name.localeCompare(b.person.name))
    setBanderOptions(opts)

    // Load record counts for display
    const counts = new Map<string, number>()
    const blCounts = new Map<string, number>()
    for (const s of sess) {
      const recs = await getRecordsBySession(s.id)
      counts.set(s.id, recs.length)
      const logs = await getSessionBanderLogs(s.id)
      blCounts.set(s.id, logs.length)
    }
    setRecordCounts(counts)
    setBanderLogCounts(blCounts)
  }

  function resetForm() {
    setFormDate(todayISO())
    setFormProtocol('')
    setFormMapsPeriod('')
    setFormMasterBanderId('')
    setFormOpenTime('')
    setFormCloseTime('')
    setFormNotes('')
    setFormParticipants(new Set())
    setFormWeatherOpenTemp(''); setFormWeatherOpenWind(''); setFormWeatherOpenCloud(''); setFormWeatherOpenPrecip('')
    setFormWeatherCloseTemp(''); setFormWeatherCloseWind(''); setFormWeatherCloseCloud(''); setFormWeatherClosePrecip('')
    if (locations.length > 0) setFormLocationId(locations[0]!.id)
  }

  async function createSession() {
    const now = new Date().toISOString()
    const session: Session = {
      id: generateId(),
      locationId: formLocationId,
      date: formDate,
      protocol: formProtocol || undefined,
      mapsPeriod: formMapsPeriod ? parseInt(formMapsPeriod) : undefined,
      masterBanderId: formMasterBanderId || undefined,
      openTime: formOpenTime || undefined,
      closeTime: formCloseTime || undefined,
      weatherOpenTemp: formWeatherOpenTemp ? parseFloat(formWeatherOpenTemp) : undefined,
      weatherOpenWind: formWeatherOpenWind ? parseInt(formWeatherOpenWind) : undefined,
      weatherOpenCloud: formWeatherOpenCloud ? parseInt(formWeatherOpenCloud) : undefined,
      weatherOpenPrecip: formWeatherOpenPrecip || undefined,
      weatherCloseTemp: formWeatherCloseTemp ? parseFloat(formWeatherCloseTemp) : undefined,
      weatherCloseWind: formWeatherCloseWind ? parseInt(formWeatherCloseWind) : undefined,
      weatherCloseCloud: formWeatherCloseCloud ? parseInt(formWeatherCloseCloud) : undefined,
      weatherClosePrecip: formWeatherClosePrecip || undefined,
      notes: formNotes || undefined,
      createdAt: now,
      updatedAt: now,
    }
    await saveSession(session)

    // Save participant bander logs
    if (formParticipants.size > 0) {
      await replaceSessionBanderLogs(session.id, Array.from(formParticipants))
    }

    // Auto-generate net logs for all active nets at the location
    await generateSessionNetLogs(session.id, formLocationId, formOpenTime || undefined, formCloseTime || undefined)

    await loadData()
    setShowNew(false)
    resetForm()
    onSelectSession(session)
  }

  function locationCode(locId: string): string {
    const loc = locations.find(l => l.id === locId)
    return loc?.banderLocationId ?? ''
  }

  function locationName(locId: string): string {
    const loc = locations.find(l => l.id === locId)
    return loc?.name ?? ''
  }

  function banderInitials(banderId: string): string {
    const opt = banderOptions.find(o => o.bander.id === banderId)
    return opt?.person.initials ?? ''
  }

  async function handleDelete(session: Session) {
    const recCount = recordCounts.get(session.id) ?? 0
    const blCount = banderLogCounts.get(session.id) ?? 0

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
    await loadData()
  }

  function toggleParticipant(banderId: string) {
    setFormParticipants(prev => {
      const next = new Set(prev)
      if (next.has(banderId)) next.delete(banderId)
      else next.add(banderId)
      return next
    })
  }

  return (
    <div style={{ padding: '1rem', maxWidth: 500, margin: '0 auto' }}>
      <PageHeader title="Banding Sessions" onHome={onHome} />

      <button onClick={() => { resetForm(); setShowNew(true) }} style={btnStyle('#2d6a4f')}>
        + New Session
      </button>

      {showNew && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>New Session</h3>

          <label style={labelStyle}>Location</label>
          <select value={formLocationId} onChange={e => setFormLocationId(e.target.value)} style={inputStyle}>
            {locations.length === 0 && <option value="">No locations — add one first</option>}
            {locations.map(loc => (
              <option key={loc.id} value={loc.id}>
                {loc.banderLocationId} — {loc.name}
              </option>
            ))}
          </select>

          <label style={labelStyle}>Date</label>
          <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} style={inputStyle} />

          <label style={labelStyle}>Protocol</label>
          <select value={formProtocol} onChange={e => setFormProtocol(e.target.value as Protocol | '')} style={inputStyle}>
            <option value="">—</option>
            {PROTOCOL_CODES.map(p => (
              <option key={p.code} value={p.code}>{p.label}</option>
            ))}
          </select>

          {formProtocol === 'MAPS' && (
            <>
              <label style={labelStyle}>MAPS Period (1-10)</label>
              <input
                type="number" min="1" max="10"
                value={formMapsPeriod}
                onChange={e => setFormMapsPeriod(e.target.value)}
                style={inputStyle}
              />
            </>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label style={labelStyle}>Open Time</label>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <input type="time" value={formOpenTime} onChange={e => setFormOpenTime(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <button type="button" onClick={() => setFormOpenTime(nowTime())} style={nowBtnStyle}>Now</button>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Close Time</label>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <input type="time" value={formCloseTime} onChange={e => setFormCloseTime(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                <button type="button" onClick={() => setFormCloseTime(nowTime())} style={nowBtnStyle}>Now</button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '0.5rem' }}>
            <Collapsible title="Weather @ Open">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={labelStyle}>Temp (°C)</label>
                  <input type="number" step="0.1" value={formWeatherOpenTemp} onChange={e => setFormWeatherOpenTemp(e.target.value)} style={inputStyle} placeholder="e.g. 15" />
                </div>
                <div>
                  <label style={labelStyle}>Wind (Beaufort 0-12)</label>
                  <input type="number" min="0" max="12" value={formWeatherOpenWind} onChange={e => setFormWeatherOpenWind(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Cloud Cover (%)</label>
                  <input type="number" min="0" max="100" value={formWeatherOpenCloud} onChange={e => setFormWeatherOpenCloud(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Precipitation</label>
                  <SearchableSelect
                    options={PRECIP_SUGGESTIONS}
                    value={formWeatherOpenPrecip}
                    onChange={setFormWeatherOpenPrecip}
                    placeholder="Type or select..."
                    allowFreeText
                  />
                </div>
              </div>
            </Collapsible>
          </div>

          <div style={{ marginTop: '0.25rem' }}>
            <Collapsible title="Weather @ Close">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={labelStyle}>Temp (°C)</label>
                  <input type="number" step="0.1" value={formWeatherCloseTemp} onChange={e => setFormWeatherCloseTemp(e.target.value)} style={inputStyle} placeholder="e.g. 22" />
                </div>
                <div>
                  <label style={labelStyle}>Wind (Beaufort 0-12)</label>
                  <input type="number" min="0" max="12" value={formWeatherCloseWind} onChange={e => setFormWeatherCloseWind(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Cloud Cover (%)</label>
                  <input type="number" min="0" max="100" value={formWeatherCloseCloud} onChange={e => setFormWeatherCloseCloud(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Precipitation</label>
                  <SearchableSelect
                    options={PRECIP_SUGGESTIONS}
                    value={formWeatherClosePrecip}
                    onChange={setFormWeatherClosePrecip}
                    placeholder="Type or select..."
                    allowFreeText
                  />
                </div>
              </div>
            </Collapsible>
          </div>

          <label style={labelStyle}>Master Bander</label>
          <select value={formMasterBanderId} onChange={e => setFormMasterBanderId(e.target.value)} style={inputStyle}>
            <option value="">—</option>
            {banderOptions.map(o => (
              <option key={o.bander.id} value={o.bander.id}>
                {o.person.initials} — {o.person.name} ({o.bander.role})
              </option>
            ))}
          </select>

          <label style={labelStyle}>Session Participants</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.5rem' }}>
            {banderOptions.map(o => (
              <label key={o.bander.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={formParticipants.has(o.bander.id)}
                  onChange={() => toggleParticipant(o.bander.id)}
                />
                {o.person.initials} — {o.person.name} ({o.bander.role})
              </label>
            ))}
            {banderOptions.length === 0 && (
              <span style={{ color: '#888', fontSize: '0.85rem' }}>No active banders — add people first</span>
            )}
          </div>

          <label style={labelStyle}>Notes</label>
          <textarea
            value={formNotes}
            onChange={e => setFormNotes(e.target.value)}
            rows={2}
            placeholder="Optional session notes"
            style={{ ...inputStyle, resize: 'vertical' }}
          />

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button onClick={createSession} disabled={!formLocationId} style={btnStyle(formLocationId ? '#2d6a4f' : '#aaa')}>Create</button>
            <button onClick={() => setShowNew(false)} style={btnStyle('#888')}>Cancel</button>
          </div>
        </div>
      )}

      <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
        {sessions.slice().reverse().map(session => {
          const recCount = recordCounts.get(session.id) ?? 0
          const locCode = locationCode(session.locationId)
          const locName = locationName(session.locationId)
          const masterInit = session.masterBanderId ? banderInitials(session.masterBanderId) : ''
          const timeRange = session.openTime && session.closeTime
            ? `${session.openTime}–${session.closeTime}`
            : session.openTime || session.closeTime || ''

          return (
            <li key={session.id} style={sessionRowStyle}>
              <div
                onClick={() => onSelectSession(session)}
                style={{ cursor: 'pointer', flex: 1 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{locCode}</span>
                    <span style={{ color: '#777', fontSize: '0.8rem', marginLeft: '0.5rem' }}>{locName}</span>
                  </div>
                  <span style={{ color: '#555', fontSize: '0.9rem' }}>{session.date}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#777', marginTop: '0.25rem' }}>
                  {[
                    session.protocol && (session.protocol === 'MAPS' && session.mapsPeriod
                      ? `MAPS ${session.mapsPeriod}`
                      : session.protocol),
                    timeRange,
                    masterInit && `Master: ${masterInit}`,
                    `${recCount} record${recCount !== 1 ? 's' : ''}`,
                  ].filter(Boolean).join(' · ')}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(session) }}
                style={deleteBtnStyle}
                title="Delete session"
              >
                ✕
              </button>
            </li>
          )
        })}
        {sessions.length === 0 && !showNew && (
          <li style={{ color: '#888', textAlign: 'center', marginTop: '2rem' }}>
            No sessions yet. Create one to start.
          </li>
        )}
      </ul>
    </div>
  )
}

const btnStyle = (bg: string): React.CSSProperties => ({
  background: bg,
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '0.6rem 1.2rem',
  fontSize: '1rem',
  cursor: 'pointer',
})

const nowBtnStyle: React.CSSProperties = {
  background: '#2d6a4f',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '0.45rem 0.6rem',
  fontSize: '0.8rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const cardStyle: React.CSSProperties = {
  background: '#f5f5f5',
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: '1rem',
  marginTop: '1rem',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  marginBottom: '0.25rem',
  marginTop: '0.5rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  fontSize: '1rem',
  borderRadius: 6,
  border: '1px solid #ccc',
  boxSizing: 'border-box',
}

const sessionRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.75rem 1rem',
  marginBottom: '0.5rem',
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 8,
}

const deleteBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#c0392b',
  fontSize: '1rem',
  cursor: 'pointer',
  padding: '0.25rem 0.5rem',
  opacity: 0.6,
}
