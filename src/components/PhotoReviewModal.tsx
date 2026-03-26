import { useState, useEffect } from 'react'

const BODY_PART_PRESETS = ['WING', 'TAIL', 'HEAD', 'BODY', 'BAND']

interface Props {
  blob: Blob
  defaultBodyPart: string
  fileName: string
  onSave: (bodyPart: string) => void
  onShare: (bodyPart: string) => void
  onCancel: () => void
  canShare: boolean
}

export default function PhotoReviewModal({ blob, defaultBodyPart, fileName, onSave, onShare, onCancel, canShare }: Props) {
  const [bodyPart, setBodyPart] = useState(defaultBodyPart || BODY_PART_PRESETS[0])
  const [customPart, setCustomPart] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    const url = URL.createObjectURL(blob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [blob])

  const isCustom = !BODY_PART_PRESETS.includes(bodyPart)
  const effectiveBodyPart = isCustom ? customPart || bodyPart : bodyPart

  async function handleShare() {
    setSharing(true)
    try {
      onShare(effectiveBodyPart)
    } finally {
      setSharing(false)
    }
  }

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Photo Preview</h3>

        {previewUrl && (
          <img
            src={previewUrl}
            alt="Captured bird"
            style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 6, marginBottom: '0.75rem', background: '#f0f0f0' }}
          />
        )}

        <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '0.5rem', wordBreak: 'break-all' }}>
          {fileName}
        </div>

        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
          Body Part / Label
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.5rem' }}>
          {BODY_PART_PRESETS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => { setBodyPart(p); setCustomPart('') }}
              style={{
                ...chipStyle,
                background: bodyPart === p ? '#2d6a4f' : '#e9ecef',
                color: bodyPart === p ? '#fff' : '#333',
              }}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setBodyPart('CUSTOM')}
            style={{
              ...chipStyle,
              background: isCustom ? '#2d6a4f' : '#e9ecef',
              color: isCustom ? '#fff' : '#333',
            }}
          >
            Other...
          </button>
        </div>

        {isCustom && (
          <input
            value={customPart}
            onChange={e => setCustomPart(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
            placeholder="e.g. MOLT, INJURY"
            style={{ ...inputStyle, marginBottom: '0.5rem' }}
            autoFocus
          />
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          {canShare ? (
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              style={{ ...btnStyle, background: '#1a73e8' }}
            >
              {sharing ? 'Sharing...' : 'Save to Drive'}
            </button>
          ) : (
            <button type="button" disabled style={{ ...btnStyle, background: '#ccc', cursor: 'default' }}>
              Mobile only
            </button>
          )}
          <button
            type="button"
            onClick={() => onSave(effectiveBodyPart)}
            style={{ ...btnStyle, background: '#2d6a4f' }}
          >
            Save Reference
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{ ...btnStyle, background: '#888' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: '1rem',
}

const modalStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 12,
  padding: '1.25rem',
  maxWidth: 420,
  width: '100%',
  maxHeight: '90vh',
  overflowY: 'auto',
}

const chipStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 16,
  padding: '0.35rem 0.75rem',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.45rem 0.5rem',
  fontSize: '1rem',
  borderRadius: 6,
  border: '1px solid #ccc',
  boxSizing: 'border-box',
}

const btnStyle: React.CSSProperties = {
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '0.6rem 1rem',
  fontSize: '0.85rem',
  cursor: 'pointer',
  flex: 1,
}
