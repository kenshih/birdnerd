import { useState } from 'react'
import JoinRoom from './JoinRoom'
import SyncedRoom from './SyncedRoom'

export default function App() {
  const [room, setRoom] = useState<string | null>(null)

  return (
    <div>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem' }}>BirdNerd Sync Spike</h1>
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#666' }}>
          v{__APP_VERSION__} · Yjs + y-webrtc
        </p>
      </header>

      {room ? (
        <SyncedRoom room={room} onLeave={() => setRoom(null)} />
      ) : (
        <JoinRoom onJoin={setRoom} />
      )}
    </div>
  )
}
