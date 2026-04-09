import { useState } from 'react'
import { colors } from '../styles/theme'

interface Props {
  onUpdate: () => void
}

export default function UpdateBanner({ onUpdate }: Props) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div style={bannerStyle}>
      <span style={{ fontSize: '0.85rem' }}>A new version is available</span>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={onUpdate} style={updateBtnStyle}>Update now</button>
        <button onClick={() => setDismissed(true)} style={dismissBtnStyle}>Later</button>
      </div>
    </div>
  )
}

const bannerStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  background: colors.primary,
  color: '#fff',
  padding: '0.6rem 1rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  zIndex: 2000,
  boxShadow: '0 -2px 8px rgba(0,0,0,0.15)',
}

const updateBtnStyle: React.CSSProperties = {
  background: '#fff',
  color: colors.primary,
  border: 'none',
  borderRadius: 4,
  padding: '0.3rem 0.75rem',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
}

const dismissBtnStyle: React.CSSProperties = {
  background: 'transparent',
  color: 'rgba(255,255,255,0.8)',
  border: '1px solid rgba(255,255,255,0.4)',
  borderRadius: 4,
  padding: '0.3rem 0.75rem',
  fontSize: '0.8rem',
  cursor: 'pointer',
}
