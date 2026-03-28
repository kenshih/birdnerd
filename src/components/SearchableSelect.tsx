import { useState, useRef, useEffect } from 'react'
import { inputStyle, dropdownStyle } from '../styles/theme'

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
  allowFreeText?: boolean
}

export default function SearchableSelect({ options, value, onChange, placeholder = 'Search...', style, allowFreeText = false }: Props) {
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
        if (allowFreeText && query && !selectedLabel) {
          onChange(query)
        }
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [allowFreeText, query, selectedLabel, onChange])

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

  function handleKeyDown(e: React.KeyboardEvent) {
    if (allowFreeText && e.key === 'Enter') {
      e.preventDefault()
      if (filtered.length > 0) {
        handleSelect(filtered[0].code)
      } else if (query) {
        onChange(query)
        setOpen(false)
        setQuery('')
      }
    }
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
        ) : value && allowFreeText ? (
          <span>{value}</span>
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
            onKeyDown={handleKeyDown}
            placeholder={allowFreeText ? (placeholder || 'Type or select...') : placeholder}
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
            {allowFreeText && query && !filtered.some(o => o.code.toLowerCase() === query.toLowerCase()) && (
              <div
                style={{ ...optionStyle, color: '#0066cc', fontStyle: 'italic' }}
                onClick={() => { onChange(query); setOpen(false); setQuery('') }}
              >
                Use "{query}"
              </div>
            )}
            {filtered.length === 0 && !allowFreeText && (
              <div style={{ padding: '0.5rem', color: '#999', fontSize: '0.85rem' }}>No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const triggerStyle: React.CSSProperties = {
  ...inputStyle,
  background: '#fff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  textAlign: 'left',
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
