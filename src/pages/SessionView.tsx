import { useState, useEffect } from 'react'
import type { BirdRecord, Session, Location, Bander, Person, Protocol } from '../types'
import { getRecordsBySession, deleteRecord, saveRecord, getLocations, getBanders, getPeople, saveSession, deleteSession, getSessionBanderLogs, replaceSessionBanderLogs } from '../db'
import BirdRecordForm from './BirdRecordForm'
import { exportSessionCSV } from '../utils/exportCsv'
import { parseCSV } from '../utils/importCsv'
import { PROTOCOL_CODES } from '../data/codes'
import PageHeader from '../components/PageHeader'

interface Props {
  session: Session
  onBack: () => void
  onHome: () => void
  onSessionDeleted: () => void
  onSessionUpdated: (session: Session) => void
}

type View = { mode: 'list' } | { mode: 'form'; record?: BirdRecord } | { mode: 'edit-session' }

interface BanderWithPerson {
  bander: Bander
  person: Person
}

export default function SessionView({ session, onBack, onHome, onSessionDeleted, onSessionUpdated }: Props) {
  const [records, setRecords] = useState<BirdRecord[]>([])
  const [view, setView] = useState<View>({ mode: 'list' })
  const [locations, setLocations] = useState<Location[]>([])
  const [banderOptions, setBanderOptions] = useState<BanderWithPerson[]>([])
  const [sessionBanderIds, setSessionBanderIds] = useState<Set<string>>(new Set())

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

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const text = await file.text()
    const { records, skippedHeaders, rowCount } = parseCSV(text)
    if (rowCount === 0) { alert('No records found in file.'); return }
    const msg = skippedHeaders.length
      ? `Import ${rowCount} record(s)?\n\nUnknown columns ignored: ${skippedHeaders.join(', ')}`
      : `Import ${rowCount} record(s) into this session?`
    if (!confirm(msg)) return
    const now = new Date().toISOString()
    for (const partial of records) {
      await saveRecord({
        ...partial,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        sessionId: session.id,
        createdAt: now,
        updatedAt: now,
      })
    }
    await loadRecords()
  }

  async function loadRecords() {
    const r = await getRecordsBySession(session.id)
    setRecords(r.sort((a, b) => a.createdAt.localeCompare(b.createdAt)))
  }

  async function loadReferenceData() {
    const [locs, banders, people, banderLogs] = await Promise.all([
      getLocations(),
      getBanders(),
      getPeople(),
      getSessionBanderLogs(session.id),
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
      notes: editNotes || undefined,
      updatedAt: new Date().toISOString(),
    }
    await saveSession(updated)
    await replaceSessionBanderLogs(session.id, Array.from(editParticipants))
    onSessionUpdated(updated)
    await loadReferenceData()
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

  if (view.mode === 'form') {
    return (
      <BirdRecordForm
        session={session}
        record={view.record}
        onSaved={() => { loadRecords(); setView({ mode: 'list' }) }}
        onCancel={() => setView({ mode: 'list' })}
        onHome={onHome}
      />
    )
  }

  if (view.mode === 'edit-session') {
    return (
      <div style={{ padding: '1rem', maxWidth: 500, margin: '0 auto' }}>
        <PageHeader title="Edit Session" onBack={() => setView({ mode: 'list' })} backLabel="← Cancel" onHome={onHome} />

        <div style={cardStyle}>
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
            <button onClick={saveEditSession} style={actionBtnStyle('#2d6a4f')}>Save</button>
            <button onClick={() => setView({ mode: 'list' })} style={actionBtnStyle('#888')}>Cancel</button>
          </div>
        </div>
      </div>
    )
  }

  // Summary stats
  const newCount = records.filter(r => r.bbpCode === '1' || r.bbpCode === 'N').length
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

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => setView({ mode: 'form' })} style={actionBtnStyle('#2d6a4f')}>
          + New Bird Record
        </button>
        <button onClick={startEditSession} style={secondaryBtnStyle}>
          Edit Session
        </button>
        {records.length > 0 && (
          <button onClick={() => exportSessionCSV(session, records, locationCode(session.locationId))} style={secondaryBtnStyle}>
            ↓ Export CSV
          </button>
        )}
        <label style={secondaryBtnStyle}>
          ↑ Import CSV
          <input type="file" accept=".csv,text/csv" onChange={handleImport} style={{ display: 'none' }} />
        </label>
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

const actionBtnStyle = (bg: string): React.CSSProperties => ({
  background: bg,
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '0.6rem 1.2rem',
  fontSize: '1rem',
  cursor: 'pointer',
})

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

const cardStyle: React.CSSProperties = {
  background: '#f5f5f5',
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: '1rem',
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
