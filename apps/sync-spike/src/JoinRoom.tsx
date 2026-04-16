import { useState } from 'react'

interface Props {
  onJoin: (room: string) => void
}

export default function JoinRoom({ onJoin }: Props) {
  const [code, setCode] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = code.trim()
    if (trimmed.length < 4) return
    onJoin(trimmed)
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <label htmlFor="room-code" style={{ fontWeight: 600 }}>
        Room code
      </label>
      <input
        id="room-code"
        type="text"
        value={code}
        onChange={e => setCode(e.target.value)}
        placeholder="any shared string (≥ 4 chars)"
        autoComplete="off"
        style={{ padding: '0.6rem', fontSize: '1rem', border: '1px solid #bbb', borderRadius: 6 }}
      />
      <button
        type="submit"
        disabled={code.trim().length < 4}
        style={{
          padding: '0.6rem',
          fontSize: '1rem',
          border: 'none',
          borderRadius: 6,
          background: '#2f5741',
          color: 'white',
          cursor: code.trim().length < 4 ? 'not-allowed' : 'pointer',
          opacity: code.trim().length < 4 ? 0.5 : 1,
        }}
      >
        Join
      </button>
      <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>
        Open this page in another tab or device, enter the same code, and edits sync via WebRTC.
      </p>
    </form>
  )
}
