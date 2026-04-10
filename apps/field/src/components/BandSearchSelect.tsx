import { useState, useRef, useEffect, useMemo } from 'react'
import type { Band, BandType } from '@birdnerd/shared'
import { inputStyle, dropdownStyle as baseDropdownStyle, btnStyle } from '../styles/theme'
import { BAND_SIZE_CODES } from '../data/codes'
import { saveBand } from '../db'

export type BandSelection =
  | { kind: 'band'; band: Band }
  | { kind: 'unbanded' }
  | { kind: 'foreign'; bandNumber: string }  // legacy: existing records without a Band entity
  | { kind: 'none' }

interface Props {
  bands: Band[]
  value: BandSelection
  onChange: (selection: BandSelection) => void
  /** Band ID already assigned to this record (so it stays selectable even if deployed/foreign) */
  currentBandId?: string
  /** Called after a new foreign Band entity is created and selected, so the caller can auto-save the linked record */
  onForeignBandCreated?: (band: Band) => Promise<void>
}

function generateId(): string {
  return `band-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function BandSearchSelect({ bands, value, onChange, currentBandId, onForeignBandCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createSize, setCreateSize] = useState('')
  const [creating, setCreating] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setShowCreateForm(false)
        setCreateSize('')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Show available, deployed, and foreign bands — all are valid selection targets
  // Retired/destroyed bands excluded unless they're the current record's band
  const filtered = useMemo(() => {
    const selectable = bands.filter(b =>
      b.status === 'available' || b.status === 'deployed' || b.status === 'foreign' || b.id === currentBandId
    )
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
    setShowCreateForm(false)
    setCreateSize('')
    setOpen(false)
  }

  function handleInputChange(text: string) {
    setSearch(text)
    setShowCreateForm(false)
    if (!open) setOpen(true)
    if (value.kind !== 'none') onChange({ kind: 'none' })
  }

  async function handleCreateForeign() {
    if (!search.trim()) return
    setCreating(true)
    const now = new Date().toISOString()
    const newBand: Band = {
      id: generateId(),
      bandNumber: search.trim(),
      status: 'foreign',
      bandSize: createSize,
      bandType: 'Standard' as BandType,
      createdAt: now,
      updatedAt: now,
    }
    await saveBand(newBand)
    setCreating(false)
    handleSelect({ kind: 'band', band: newBand })
    await onForeignBandCreated?.(newBand)
  }

  const showForeignOption = search.length >= 4 && !hasExactMatch

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

          {showForeignOption && !showCreateForm && (
            <div
              style={{ ...optionStyle, borderTop: '1px solid #eee' }}
              onClick={() => setShowCreateForm(true)}
            >
              <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{search}</span>
              <span style={{ ...miniChip, background: '#fff3cd' }}>add as foreign band →</span>
            </div>
          )}

          {showForeignOption && showCreateForm && (
            <div style={{ padding: '0.5rem', borderTop: '1px solid #eee', background: '#fffdf0' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Add foreign band: <span style={{ fontFamily: 'monospace' }}>{search}</span>
              </div>
              <select
                value={createSize}
                onChange={e => setCreateSize(e.target.value)}
                style={{ ...inputStyle, marginBottom: '0.4rem', fontSize: '0.85rem' }}
              >
                <option value="">Band size (optional)</option>
                {BAND_SIZE_CODES.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
              </select>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={handleCreateForeign}
                  disabled={creating}
                  style={{ ...btnStyle('#2d6a4f'), fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                >
                  {creating ? 'Adding...' : 'Add Foreign Band'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreateForm(false) }}
                  style={{ ...btnStyle('#888'), fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {filtered.length === 0 && !showForeignOption && search && (
            <div style={{ padding: '0.5rem', color: '#888', fontSize: '0.85rem', textAlign: 'center' }}>
              No bands match.
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
    case 'foreign': return '#fff3cd'
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

const dropdownStyle: React.CSSProperties = {
  ...baseDropdownStyle,
  maxHeight: 300,
  overflowY: 'auto',
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
