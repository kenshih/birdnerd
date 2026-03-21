import { useState, useRef, useEffect } from 'react'

interface Option {
  code: string
  label: string
}

interface Props {
  options: Option[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  style?: React.CSSProperties
}

export default function SearchableSelect({ options, value, onChange, placeholder = 'Search...', style }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query
    ? options.filter(o =>
        o.code.toLowerCase().includes(query.toLowerCase()) ||
        o.label.toLowerCase().includes(query.toLowerCase())
      )
    : options

  const selectedLabel = options.find(o => o.code === value)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(code: string) {
    onChange(code)
    setOpen(false)
    setQuery('')
  }

  function handleClear() {
    onChange('')
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', ...style }}>
      <button
        type="button"
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 0) }}
        style={triggerStyle}
      >
        {selectedLabel ? (
          <span>{selectedLabel.code} — {selectedLabel.label}</span>
        ) : (
          <span style={{ color: '#999' }}>—</span>
        )}
        <span style={{ fontSize: '0.7rem', marginLeft: 'auto' }}>▼</span>
      </button>

      {open && (
        <div style={dropdownStyle}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={placeholder}
            style={searchInputStyle}
          />
          <div style={listStyle}>
            <div
              style={optionStyle}
              onClick={handleClear}
            >
              <span style={{ color: '#999' }}>— (clear)</span>
            </div>
            {filtered.map(o => (
              <div
                key={o.code}
                style={{
                  ...optionStyle,
                  background: o.code === value ? '#d8f3dc' : undefined,
                }}
                onClick={() => handleSelect(o.code)}
              >
                <strong>{o.code}</strong>
                <span style={{ marginLeft: '0.4rem', color: '#555', fontSize: '0.85rem' }}>{o.label}</span>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '0.5rem', color: '#999', fontSize: '0.85rem' }}>No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const triggerStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.45rem 0.5rem',
  fontSize: '1rem',
  borderRadius: 6,
  border: '1px solid #ccc',
  boxSizing: 'border-box',
  background: '#fff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  textAlign: 'left',
}

const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  background: '#fff',
  border: '1px solid #ccc',
  borderRadius: 6,
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  zIndex: 100,
  marginTop: 2,
}

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.45rem 0.5rem',
  fontSize: '0.9rem',
  border: 'none',
  borderBottom: '1px solid #eee',
  boxSizing: 'border-box',
  outline: 'none',
}

const listStyle: React.CSSProperties = {
  maxHeight: 200,
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
}

const optionStyle: React.CSSProperties = {
  padding: '0.4rem 0.5rem',
  cursor: 'pointer',
  fontSize: '0.9rem',
  borderBottom: '1px solid #f5f5f5',
}
