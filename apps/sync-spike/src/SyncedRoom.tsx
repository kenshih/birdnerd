import { useEffect, useRef, useState } from 'react'
import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'

interface Props {
  room: string
  onLeave: () => void
}

export default function SyncedRoom({ room, onLeave }: Props) {
  const [text, setText] = useState('')
  const [peerCount, setPeerCount] = useState(0)
  const ytextRef = useRef<Y.Text | null>(null)
  const applyingRemote = useRef(false)

  useEffect(() => {
    const ydoc = new Y.Doc()
    const provider = new WebrtcProvider(`birdnerd-sync-spike-${room}`, ydoc)
    const ytext = ydoc.getText('shared')
    ytextRef.current = ytext

    setText(ytext.toString())

    const onYTextChange = () => {
      applyingRemote.current = true
      setText(ytext.toString())
      applyingRemote.current = false
    }
    ytext.observe(onYTextChange)

    const onPeersChange = () => {
      setPeerCount(provider.room?.webrtcConns.size ?? 0)
    }
    provider.on('peers', onPeersChange)

    return () => {
      ytext.unobserve(onYTextChange)
      provider.off('peers', onPeersChange)
      provider.destroy()
      ydoc.destroy()
      ytextRef.current = null
    }
  }, [room])

  function handleChange(next: string) {
    if (applyingRemote.current) return
    const ytext = ytextRef.current
    if (!ytext) return
    ytext.doc?.transact(() => {
      ytext.delete(0, ytext.length)
      ytext.insert(0, next)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '0.9rem' }}>
          Room: <code style={{ background: '#eee', padding: '0.15rem 0.4rem', borderRadius: 4 }}>{room}</code>
        </div>
        <button
          onClick={onLeave}
          style={{ padding: '0.4rem 0.7rem', fontSize: '0.85rem', border: '1px solid #bbb', borderRadius: 6, background: 'white', cursor: 'pointer' }}
        >
          Leave
        </button>
      </div>

      <div style={{ fontSize: '0.85rem', color: '#2f5741' }}>
        Connected peers: <strong>{peerCount}</strong>
        {peerCount === 0 && ' — open the same room in another tab or device'}
      </div>

      <textarea
        value={text}
        onChange={e => handleChange(e.target.value)}
        placeholder="Type here — edits sync to every peer in this room."
        rows={10}
        style={{ padding: '0.6rem', fontSize: '1rem', fontFamily: 'inherit', border: '1px solid #bbb', borderRadius: 6, resize: 'vertical' }}
      />
    </div>
  )
}
