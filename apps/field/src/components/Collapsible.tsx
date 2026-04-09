import { useState } from 'react'

interface Props {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export default function Collapsible({ title, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={containerStyle}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={headerStyle}
      >
        <span style={{ marginRight: '0.5rem' }}>{open ? '▾' : '▸'}</span>
        {title}
      </button>
      {open && <div style={bodyStyle}>{children}</div>}
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 6,
  marginBottom: '0.5rem',
  overflow: 'visible',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  padding: '0.5rem 0.75rem',
  background: '#f8f9fa',
  border: 'none',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: '#333',
  cursor: 'pointer',
  textAlign: 'left',
}

const bodyStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem 0.75rem',
}
