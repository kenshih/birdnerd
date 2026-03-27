import { useState, useRef, useEffect, useMemo } from 'react'
import type { Band } from '../types'

export type BandSelection =
  | { kind: 'band'; band: Band }
  | { kind: 'unbanded' }
  | { kind: 'foreign'; bandNumber: string }
  | { kind: 'none' }

interface Props {
  bands: Band[]
  value: BandSelection
  onChange: (selection: BandSelection) => void
  /** Band ID already assigned to this record (so it stays selectable even if deployed) */
  currentBandId?: string
}

export default function BandSearchSelect({ bands, value, onChange, currentBandId }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Only show available bands — deployed bands can't be assigned to another bird
  // Exception: the band already on this record (so editing a recap can re-select it)
  const filtered = useMemo(() => {
    const selectable = bands.filter(b => b.status === 'available' || b.id === currentBandId)
    if (!search) return selectable.slice(0, 50)
    return selectable.filter(b => b.bandNumber.includes(search)).slice(0, 50)
  }, [bands, search, currentBandId])

  const hasExactMatch = useMemo(() => {
    return bands.some(b => b.bandNumber === search)
  }, [bands, search])

  function displayValue(): string {
    switch (value.kind) {
      case 'band': return value.band.bandNumber
      case 'unbanded': return 'UNBANDED'
      case 'foreign': return value.bandNumber
      case 'none': return ''
    }
  }

  function handleSelect(sel: BandSelection) {
    onChange(sel)
    setSearch('')
    setOpen(false)
  }

  function handleInputChange(text: string) {
    setSearch(text)
    if (!open) setOpen(true)
    // Clear selection when user starts typing something different
    if (value.kind !== 'none') {
      onChange({ kind: 'none' })
    }
  }

  const showForeignOption = search.length >= 5 && !hasExactMatch

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={open ? search : displayValue()}
        onChange={e => handleInputChange(e.target.value)}
        onFocus={() => { setOpen(true); setSearch(open ? search : '') }}
        placeholder="Search band # or UNBANDED"
        style={inputStyle}
        inputMode="numeric"
      />

      {value.kind !== 'none' && !open && (
        <span style={chipStyle(value.kind === 'band' ? value.band.status : value.kind)}>
          {value.kind === 'band' ? value.band.status : value.kind === 'unbanded' ? 'unbanded' : 'foreign'}
        </span>
      )}

      {open && (
        <div style={dropdownStyle}>
          {/* UNBANDED option always first */}
          <div style={optionStyle} onClick={() => handleSelect({ kind: 'unbanded' })}>
            <span style={{ fontWeight: 500 }}>UNBANDED</span>
            <span style={{ ...miniChip, background: '#e2e3e5' }}>no band</span>
          </div>

          {filtered.map(b => (
            <div key={b.id} style={optionStyle} onClick={() => handleSelect({ kind: 'band', band: b })}>
              <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{b.bandNumber}</span>
              <span style={{ fontSize: '0.75rem', color: '#666' }}>{b.bandSize} · {b.bandType}</span>
              <span style={{ ...miniChip, background: statusBg(b.status) }}>{b.status}</span>
            </div>
          ))}

          {showForeignOption && (
            <div style={{ ...optionStyle, borderTop: '1px solid #eee' }} onClick={() => handleSelect({ kind: 'foreign', bandNumber: search })}>
              <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{search}</span>
              <span style={{ ...miniChip, background: '#fff3cd' }}>foreign recapture</span>
            </div>
          )}

          {filtered.length === 0 && !showForeignOption && search && (
            <div style={{ padding: '0.5rem', color: '#888', fontSize: '0.85rem', textAlign: 'center' }}>
              No bands match. Type full number for foreign recapture.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function statusBg(status: string): string {
  switch (status) {
    case 'available': return '#d4edda'
    case 'deployed': return '#cce5ff'
    default: return '#e2e3e5'
  }
}

function chipStyle(kind: string): React.CSSProperties {
  let bg = '#e2e3e5'
  if (kind === 'available') bg = '#d4edda'
  else if (kind === 'deployed') bg = '#cce5ff'
  else if (kind === 'foreign') bg = '#fff3cd'
  return {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '0.7rem',
    padding: '0.1rem 0.4rem',
    borderRadius: 4,
    fontWeight: 500,
    background: bg,
    pointerEvents: 'none',
  }
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.45rem 0.5rem',
  fontSize: '1rem',
  borderRadius: 6,
  border: '1px solid #ccc',
  boxSizing: 'border-box',
}

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  maxHeight: 250,
  overflowY: 'auto',
  background: '#fff',
  border: '1px solid #ccc',
  borderRadius: 6,
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  zIndex: 100,
  marginTop: 2,
}

const optionStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem',
  cursor: 'pointer',
  fontSize: '0.9rem',
}

const miniChip: React.CSSProperties = {
  fontSize: '0.65rem',
  padding: '0.05rem 0.3rem',
  borderRadius: 3,
  fontWeight: 500,
  marginLeft: 'auto',
  whiteSpace: 'nowrap',
}
