import { useState, useRef, useEffect } from 'react'
import { SPECIES_LIST } from '../data/species'
import type { Species } from '../types'
import { inputStyle, dropdownStyle as baseDropdownStyle } from '../styles/theme'

interface Props {
  value: string
  onChange: (code: string) => void
}

export default function SpeciesAutocomplete({ value, onChange }: Props) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const matches: Species[] = query.length >= 1
    ? SPECIES_LIST.filter(s =>
        s.code.toLowerCase().startsWith(query.toLowerCase()) ||
        s.commonName.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8)
    : []

  useEffect(() => {
    setHighlighted(0)
  }, [query])

  function select(species: Species) {
    setQuery(species.code)
    onChange(species.code)
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      setHighlighted(h => Math.min(h + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      setHighlighted(h => Math.max(h - 1, 0))
    } else if (e.key === 'Enter' && matches[highlighted]) {
      select(matches[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); onChange('') }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder="Code or name (e.g. SOSP)"
        style={inputStyle}
        autoComplete="off"
        spellCheck={false}
      />
      {open && matches.length > 0 && (
        <ul style={dropdownStyle}>
          {matches.map((s, i) => (
            <li
              key={s.code}
              onMouseDown={() => select(s)}
              style={{
                ...dropdownItemStyle,
                background: i === highlighted ? '#d8f3dc' : '#fff',
              }}
            >
              <strong>{s.code}</strong>
              <span style={{ color: '#555', marginLeft: '0.5rem' }}>{s.commonName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const dropdownStyle: React.CSSProperties = {
  ...baseDropdownStyle,
  listStyle: 'none',
  margin: 0,
  padding: 0,
  maxHeight: 250,
  overflowY: 'auto',
}

const dropdownItemStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  cursor: 'pointer',
  fontSize: '0.95rem',
}
