import { useState, useEffect } from 'react'
import type { Location } from '../types'
import { getLocations, saveLocation, deleteLocation, getNetsByLocation } from '../db'
import PageHeader from '../components/PageHeader'

interface Props {
  onSelectLocation: (location: Location) => void
  onHome: () => void
}

function generateId(): string {
  return `loc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function LocationList({ onSelectLocation, onHome }: Props) {
  const [locations, setLocations] = useState<Location[]>([])
  const [netCounts, setNetCounts] = useState<Record<string, number>>({})
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState(emptyForm())

  useEffect(() => {
    loadLocations()
  }, [])

  async function loadLocations() {
    const locs = await getLocations()
    setLocations(locs)
    const counts: Record<string, number> = {}
    for (const loc of locs) {
      const nets = await getNetsByLocation(loc.id)
      counts[loc.id] = nets.length
    }
    setNetCounts(counts)
  }

  function emptyForm() {
    return { name: '', banderLocationId: '', bblLocationId: '', latitude: '', longitude: '', country: 'US', stateProvince: 'CA', remarks: '' }
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.banderLocationId.trim()) return
    const now = new Date().toISOString()
    const loc: Location = {
      id: generateId(),
      name: form.name.trim(),
      banderLocationId: form.banderLocationId.trim().toUpperCase(),
      bblLocationId: form.bblLocationId.trim() || null,
      latitude: parseFloat(form.latitude) || 0,
      longitude: parseFloat(form.longitude) || 0,
      country: form.country.trim(),
      stateProvince: form.stateProvince.trim(),
      remarks: form.remarks.trim(),
      createdAt: now,
      updatedAt: now,
    }
    await saveLocation(loc)
    await loadLocations()
    setForm(emptyForm())
    setShowNew(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this location and all its nets?')) return
    await deleteLocation(id)
    await loadLocations()
  }

  return (
    <div style={{ padding: '1rem', maxWidth: 500, margin: '0 auto' }}>
      <PageHeader title="Project Locations" onHome={onHome} />

      <button onClick={() => setShowNew(true)} style={btnStyle('#2d6a4f')}>
        + New Location
      </button>

      {showNew && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>New Location</h3>
          <label style={labelStyle}>Name *</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Galindo Creek Banding Station" style={inputStyle} />

          <div style={rowStyle}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Bander Location ID (4-letter) *</label>
              <input value={form.banderLocationId} onChange={e => setForm({ ...form, banderLocationId: e.target.value })} placeholder="e.g. GCBS" maxLength={4} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>BBL Location ID (6-letter)</label>
              <input value={form.bblLocationId} onChange={e => setForm({ ...form, bblLocationId: e.target.value })} placeholder="Optional" maxLength={6} style={inputStyle} />
            </div>
          </div>

          <div style={rowStyle}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Latitude</label>
              <input value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} placeholder="e.g. 37.9365" type="number" step="any" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Longitude</label>
              <input value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} placeholder="e.g. -122.0855" type="number" step="any" style={inputStyle} />
            </div>
          </div>

          <div style={rowStyle}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Country</label>
              <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>State/Province</label>
              <input value={form.stateProvince} onChange={e => setForm({ ...form, stateProvince: e.target.value })} style={inputStyle} />
            </div>
          </div>

          <label style={labelStyle}>Remarks</label>
          <textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} rows={2} placeholder="Optional" style={{ ...inputStyle, resize: 'vertical' }} />

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button onClick={handleCreate} style={btnStyle('#2d6a4f')}>Create</button>
            <button onClick={() => { setShowNew(false); setForm(emptyForm()) }} style={btnStyle('#888')}>Cancel</button>
          </div>
        </div>
      )}

      <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
        {locations.map(loc => (
          <li key={loc.id} style={{ marginBottom: '0.5rem' }}>
            <div style={locationRowStyle}>
              <button onClick={() => onSelectLocation(loc)} style={locationBtnStyle}>
                <div>
                  <span style={{ fontWeight: 600 }}>{loc.banderLocationId}</span>
                  <span style={{ color: '#555', fontSize: '0.85rem', marginLeft: '0.5rem' }}>{loc.name}</span>
                </div>
                <span style={{ color: '#888', fontSize: '0.8rem' }}>{netCounts[loc.id] ?? 0} nets</span>
              </button>
              <button onClick={() => handleDelete(loc.id)} style={deleteBtnStyle} aria-label="Delete">&#x2715;</button>
            </div>
          </li>
        ))}
        {locations.length === 0 && !showNew && (
          <li style={{ color: '#888', textAlign: 'center', marginTop: '2rem' }}>
            No locations yet. Create one to get started.
          </li>
        )}
      </ul>
    </div>
  )
}

const btnStyle = (bg: string): React.CSSProperties => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 6,
  padding: '0.6rem 1.2rem', fontSize: '1rem', cursor: 'pointer',
})

const cardStyle: React.CSSProperties = {
  background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 8,
  padding: '1rem', marginTop: '1rem',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.85rem', fontWeight: 600,
  marginBottom: '0.25rem', marginTop: '0.5rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem', fontSize: '1rem', borderRadius: 6,
  border: '1px solid #ccc', boxSizing: 'border-box',
}

const rowStyle: React.CSSProperties = {
  display: 'flex', gap: '0.5rem',
}

const locationRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '0.5rem',
}

const locationBtnStyle: React.CSSProperties = {
  flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '0.75rem 1rem', background: '#fff', border: '1px solid #ddd',
  borderRadius: 8, cursor: 'pointer', fontSize: '1rem', textAlign: 'left',
}

const deleteBtnStyle: React.CSSProperties = {
  background: 'none', border: '1px solid #ddd', borderRadius: 8,
  padding: '0.75rem 0.75rem', cursor: 'pointer', color: '#c44', fontSize: '0.9rem',
}

