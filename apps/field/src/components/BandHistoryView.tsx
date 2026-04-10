import { useEffect, useState } from 'react'
import type { Band, BirdRecord, Session, Location, Person, Bander } from '@birdnerd/shared'
import { getRecordsByBand, getSessions, getLocations, getPeople, getBanders, getPhotosByRecord } from '../db'
import PageHeader from './PageHeader'
import { CardElevated } from './Card'
import { colors } from '../styles/theme'

interface Props {
  band: Band
  onBack: () => void
  onHome: () => void
  onSelectSession: (session: Session) => void
}

interface EncounterRow {
  record: BirdRecord
  session: Session
  locationCode: string
  banderInitials: string
  hasPhotos: boolean
}

export default function BandHistoryView({ band, onBack, onHome, onSelectSession }: Props) {
  const [encounters, setEncounters] = useState<EncounterRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [band.id])

  async function loadHistory() {
    setLoading(true)
    const [records, sessions, locations, people, banders] = await Promise.all([
      getRecordsByBand(band.id),
      getSessions(),
      getLocations(),
      getPeople(),
      getBanders(),
    ])

    const sessionMap = new Map<string, Session>(sessions.map(s => [s.id, s]))
    const locationMap = new Map<string, Location>(locations.map(l => [l.id, l]))
    const personMap = new Map<string, Person>(people.map(p => [p.id, p]))
    const banderMap = new Map<string, Bander>(banders.map(b => [b.id, b]))

    const rows: EncounterRow[] = []
    for (const rec of records) {
      const session = sessionMap.get(rec.sessionId)
      if (!session) continue
      const location = locationMap.get(session.locationId)
      const locationCode = location?.banderLocationId ?? '?'

      let banderInitials = '?'
      if (rec.bander) {
        const bander = banderMap.get(rec.bander)
        if (bander) {
          const person = personMap.get(bander.personId)
          if (person) banderInitials = person.initials
        }
      }

      const photos = await getPhotosByRecord(rec.id)
      rows.push({ record: rec, session, locationCode, banderInitials, hasPhotos: photos.length > 0 })
    }

    // Sort by date descending (most recent first)
    rows.sort((a, b) => {
      const da = a.session.date ?? ''
      const db2 = b.session.date ?? ''
      return db2.localeCompare(da)
    })

    setEncounters(rows)
    setLoading(false)
  }

  const hasRecap = encounters.some(e => e.record.bbpCode === 'R' || e.record.bbpCode === 'F')
  const lastDate = encounters[0]?.session.date ?? '—'
  const speciesCode = encounters[0]?.record.speciesCode ?? band.currentSpecies ?? '—'

  if (loading) return <div style={{ padding: '1rem' }}>Loading...</div>

  return (
    <div style={{ padding: '1rem', maxWidth: 500, margin: '0 auto' }}>
      <PageHeader title="Band History" onBack={onBack} onHome={onHome} />

      <CardElevated>
        <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 700 }}>{band.bandNumber}</div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
          <span style={{ ...chipStyle, background: statusColor(band.status) }}>{band.status}</span>
          {band.bandSize && <span style={{ ...chipStyle, background: colors.bgGray }}>{band.bandSize}</span>}
          {speciesCode !== '—' && <span style={{ ...chipStyle, background: colors.primaryLight }}>{speciesCode}</span>}
          {hasRecap && <span style={{ ...chipStyle, background: '#fff3cd' }}>recapped</span>}
        </div>
        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: colors.textSecondary }}>
          Last seen: <strong>{lastDate}</strong> · {encounters.length} encounter{encounters.length !== 1 ? 's' : ''}
        </div>
      </CardElevated>

      {encounters.length === 0 ? (
        <div style={{ color: colors.textMuted, textAlign: 'center', padding: '2rem' }}>
          No banding records found for this band.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
          {encounters.map(({ record, session, locationCode, banderInitials, hasPhotos }) => (
            <button
              key={record.id}
              onClick={() => onSelectSession(session)}
              style={rowBtnStyle}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {session.date ?? '?'} · {locationCode}
                </div>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  {hasPhotos && <span title="Has photos">📷</span>}
                  {record.notes?.trim() && <span title="Has notes">📝</span>}
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: colors.textSecondary, marginTop: '0.2rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {record.speciesCode && <span>{record.speciesCode}</span>}
                {record.bbpCode && <span style={{ ...chipStyle, background: colors.bgGray, fontSize: '0.75rem' }}>{record.bbpCode}</span>}
                {record.sex && <span>{record.sex}</span>}
                {record.wrp && <span style={{ color: colors.textMuted }}>{record.wrp}</span>}
                <span style={{ color: colors.textMuted }}>{banderInitials}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function statusColor(status: string): string {
  switch (status) {
    case 'available': return '#d4edda'
    case 'deployed': return '#cce5ff'
    case 'foreign': return '#fff3cd'
    case 'destroyed': return '#f8d7da'
    case 'lost': return '#fff3cd'
    case 'replaced': return '#e2e3e5'
    default: return '#e2e3e5'
  }
}

const chipStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  padding: '0.15rem 0.4rem',
  borderRadius: 4,
  fontWeight: 500,
}

const rowBtnStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #eee',
  borderRadius: 8,
  padding: '0.6rem 0.75rem',
  cursor: 'pointer',
  textAlign: 'left',
  width: '100%',
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
}
