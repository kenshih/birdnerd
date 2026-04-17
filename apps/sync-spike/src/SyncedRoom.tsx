import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'
import type { BirdRecord } from '@birdnerd/shared'
import {
  getRecordsMap,
  getAllRecords,
  addRecord,
  updateRecordField,
  deleteRecord,
} from './syncAdapter'

interface Props {
  room: string
  onLeave: () => void
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function makeStubRecord(): BirdRecord {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    sessionId: 'spike-session',
    speciesCode: '',
    bandNumber: '',
    createdAt: now,
    updatedAt: now,
  }
}

const EDITABLE_FIELDS = ['speciesCode', 'bandNumber', 'age', 'sex', 'notes'] as const

export default function SyncedRoom({ room, onLeave }: Props) {
  const [records, setRecords] = useState<BirdRecord[]>([])
  const [peerCount, setPeerCount] = useState(0)
  const docRef = useRef<Y.Doc | null>(null)

  useEffect(() => {
    const ydoc = new Y.Doc()
    docRef.current = ydoc
    const provider = new WebrtcProvider(`birdnerd-sync-spike-${room}`, ydoc)

    const syncRecords = () => setRecords(getAllRecords(ydoc))

    const recordsMap = getRecordsMap(ydoc)
    recordsMap.observeDeep(syncRecords)
    syncRecords()

    const onPeersChange = () => {
      setPeerCount(provider.room?.webrtcConns.size ?? 0)
    }
    provider.on('peers', onPeersChange)

    return () => {
      recordsMap.unobserveDeep(syncRecords)
      provider.off('peers', onPeersChange)
      provider.destroy()
      ydoc.destroy()
      docRef.current = null
    }
  }, [room])

  function handleAdd() {
    if (!docRef.current) return
    addRecord(docRef.current, makeStubRecord())
  }

  function handleFieldChange(id: string, field: string, value: string) {
    if (!docRef.current) return
    updateRecordField(docRef.current, id, field, value)
  }

  function handleDelete(id: string) {
    if (!docRef.current) return
    deleteRecord(docRef.current, id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '0.9rem' }}>
          Room: <code style={{ background: '#eee', padding: '0.15rem 0.4rem', borderRadius: 4 }}>{room}</code>
        </div>
        <button onClick={onLeave} style={buttonStyle}>
          Leave
        </button>
      </div>

      <div style={{ fontSize: '0.85rem', color: '#2f5741' }}>
        Connected peers: <strong>{peerCount}</strong>
        {peerCount === 0 && ' — open the same room in another tab or device'}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <strong style={{ fontSize: '0.95rem' }}>
          Banding Records ({records.length})
        </strong>
        <button onClick={handleAdd} style={{ ...buttonStyle, background: '#d8f3dc' }}>
          + Add Record
        </button>
      </div>

      {records.length === 0 && (
        <div style={{ color: '#888', fontSize: '0.9rem', padding: '1rem 0' }}>
          No records yet. Add one to start syncing.
        </div>
      )}

      {records.map(rec => (
        <div key={rec.id} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <code style={{ fontSize: '0.75rem', color: '#888' }}>{rec.id}</code>
            <button
              onClick={() => handleDelete(rec.id)}
              style={{ ...buttonStyle, fontSize: '0.75rem', padding: '0.2rem 0.5rem', color: '#c44' }}
            >
              Delete
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem 0.6rem' }}>
            {EDITABLE_FIELDS.map(field => (
              <label key={field} style={{ fontSize: '0.85rem' }}>
                <span style={{ color: '#555' }}>{field}</span>
                <input
                  value={(rec[field] as string) ?? ''}
                  onChange={e => handleFieldChange(rec.id, field, e.target.value)}
                  style={inputStyle}
                />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const buttonStyle: React.CSSProperties = {
  padding: '0.4rem 0.7rem',
  fontSize: '0.85rem',
  border: '1px solid #bbb',
  borderRadius: 6,
  background: 'white',
  cursor: 'pointer',
}

const cardStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: '0.6rem 0.75rem',
  background: '#fafafa',
}

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.3rem 0.4rem',
  fontSize: '0.85rem',
  border: '1px solid #ccc',
  borderRadius: 4,
  marginTop: '0.1rem',
  boxSizing: 'border-box',
}
