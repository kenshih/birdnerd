import { useState, useEffect } from 'react'
import type { Session } from '../types'
import { getSessions, saveSession } from '../db'
import { STATIONS } from '../data/codes'

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

export default function SessionList({ onSelectSession, onHome }: Props) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [showNew, setShowNew] = useState(false)
  const [newStation, setNewStation] = useState(STATIONS[0]?.code ?? '')
  const [newDate, setNewDate] = useState(todayISO())

  useEffect(() => {
    getSessions().then(setSessions)
  }, [])

  async function createSession() {
    const session: Session = {
      id: generateId(),
      station: newStation,
      date: newDate,
      createdAt: new Date().toISOString(),
    }
    await saveSession(session)
    setSessions(await getSessions())
    setShowNew(false)
    onSelectSession(session)
  }

  return (
    <div style={{ padding: '1rem', maxWidth: 500, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={onHome} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', padding: 0, lineHeight: 1 }} aria-label="Home">🏠</button>
        <h1 style={{ fontSize: '1.4rem', margin: 0 }}>Banding Sessions</h1>
      </div>

      <button
        onClick={() => setShowNew(true)}
        style={btnStyle('#2d6a4f')}
      >
        + New Session
      </button>

      {showNew && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>New Session</h3>
          <label style={labelStyle}>Station</label>
          <select
            value={newStation}
            onChange={e => setNewStation(e.target.value)}
            style={inputStyle}
          >
            {STATIONS.map(s => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
          </select>

          <label style={labelStyle}>Date</label>
          <input
            type="date"
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
            style={inputStyle}
          />

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button onClick={createSession} style={btnStyle('#2d6a4f')}>Create</button>
            <button onClick={() => setShowNew(false)} style={btnStyle('#888')}>Cancel</button>
          </div>
        </div>
      )}

      <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
        {sessions.slice().reverse().map(session => (
          <li key={session.id}>
            <button
              onClick={() => onSelectSession(session)}
              style={sessionRowStyle}
            >
              <span style={{ fontWeight: 600 }}>{session.station}</span>
              <span style={{ color: '#555' }}>{session.date}</span>
            </button>
          </li>
        ))}
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
  justifyContent: 'space-between',
  width: '100%',
  padding: '0.75rem 1rem',
  marginBottom: '0.5rem',
  background: '#fff',
  border: '1px solid #ddd',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: '1rem',
}
