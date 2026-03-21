import { useState, useEffect } from 'react'
import type { Location, Net } from '../types'
import { getNetsByLocation, saveNet, deleteNet, saveLocation } from '../db'

interface Props {
  location: Location
  onBack: () => void
  onLocationUpdated: () => void
}

function generateId(): string {
  return `net-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function LocationDetail({ location, onBack, onLocationUpdated }: Props) {
  const [nets, setNets] = useState<Net[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(locationToForm(location))

  useEffect(() => {
    loadNets()
  }, [location.id])

  async function loadNets() {
    const n = await getNetsByLocation(location.id)
    setNets(n.sort((a, b) => {
      const aNum = parseInt(a.label), bNum = parseInt(b.label)
      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum
      return a.label.localeCompare(b.label)
    }))
  }

  function locationToForm(loc: Location) {
    return {
      name: loc.name,
      banderLocationId: loc.banderLocationId,
      bblLocationId: loc.bblLocationId ?? '',
      latitude: String(loc.latitude),
      longitude: String(loc.longitude),
      country: loc.country,
      stateProvince: loc.stateProvince,
      remarks: loc.remarks,
    }
  }

  async function handleAddNet() {
    if (!newLabel.trim()) return
    const now = new Date().toISOString()
    const net: Net = {
      id: generateId(),
      locationId: location.id,
      label: newLabel.trim(),
      createdAt: now,
      updatedAt: now,
    }
    await saveNet(net)
    setNewLabel('')
    await loadNets()
  }

  async function handleDeleteNet(id: string) {
    await deleteNet(id)
    await loadNets()
  }

  async function handleSaveLocation() {
    const updated: Location = {
      ...location,
      name: form.name.trim(),
      banderLocationId: form.banderLocationId.trim().toUpperCase(),
      bblLocationId: form.bblLocationId.trim() || null,
      latitude: parseFloat(form.latitude) || 0,
      longitude: parseFloat(form.longitude) || 0,
      country: form.country.trim(),
      stateProvince: form.stateProvince.trim(),
      remarks: form.remarks.trim(),
      updatedAt: new Date().toISOString(),
    }
    await saveLocation(updated)
    setEditing(false)
    onLocationUpdated()
  }

  return (
    <div style={{ padding: '1rem', maxWidth: 500, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={onBack} style={backBtnStyle}>&#x2190; Back</button>
        <h1 style={{ fontSize: '1.4rem', margin: 0 }}>{location.banderLocationId}</h1>
      </div>

      {/* Location details */}
      {editing ? (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Edit Location</h3>
          <label style={labelStyle}>Name</label>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />

          <div style={rowStyle}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Bander ID (4-letter)</label>
              <input value={form.banderLocationId} onChange={e => setForm({ ...form, banderLocationId: e.target.value })} maxLength={4} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>BBL ID (6-letter)</label>
              <input value={form.bblLocationId} onChange={e => setForm({ ...form, bblLocationId: e.target.value })} maxLength={6} style={inputStyle} />
            </div>
          </div>

          <div style={rowStyle}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Latitude</label>
              <input value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} type="number" step="any" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Longitude</label>
              <input value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} type="number" step="any" style={inputStyle} />
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
          <textarea value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button onClick={handleSaveLocation} style={btnStyle('#2d6a4f')}>Save</button>
            <button onClick={() => { setEditing(false); setForm(locationToForm(location)) }} style={btnStyle('#888')}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{location.name}</div>
              <div style={{ color: '#555', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                {location.country}, {location.stateProvince}
                {location.latitude ? ` · ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : ''}
              </div>
              {location.bblLocationId && (
                <div style={{ color: '#555', fontSize: '0.85rem' }}>BBL: {location.bblLocationId}</div>
              )}
              {location.remarks && (
                <div style={{ color: '#777', fontSize: '0.85rem', marginTop: '0.25rem' }}>{location.remarks}</div>
              )}
            </div>
            <button onClick={() => setEditing(true)} style={editBtnStyle}>Edit</button>
          </div>
        </div>
      )}

      {/* Net inventory */}
      <div style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', margin: '0 0 0.75rem' }}>Nets ({nets.length})</h2>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="Net label (e.g. 11, Trap-A)"
            style={{ ...inputStyle, flex: 1 }}
            onKeyDown={e => e.key === 'Enter' && handleAddNet()}
          />
          <button onClick={handleAddNet} style={btnStyle('#2d6a4f')}>Add</button>
        </div>

        {nets.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center' }}>No nets defined yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {nets.map(net => (
              <li key={net.id} style={netRowStyle}>
                <span style={{ fontWeight: 600 }}>{net.label}</span>
                <button onClick={() => handleDeleteNet(net.id)} style={deleteNetBtnStyle} aria-label="Delete">&#x2715;</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

const btnStyle = (bg: string): React.CSSProperties => ({
  background: bg, color: '#fff', border: 'none', borderRadius: 6,
  padding: '0.6rem 1.2rem', fontSize: '1rem', cursor: 'pointer',
})

const cardStyle: React.CSSProperties = {
  background: '#f5f5f5', border: '1px solid #ddd', borderRadius: 8, padding: '1rem',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.85rem', fontWeight: 600,
  marginBottom: '0.25rem', marginTop: '0.5rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem', fontSize: '1rem', borderRadius: 6,
  border: '1px solid #ccc', boxSizing: 'border-box',
}

const rowStyle: React.CSSProperties = { display: 'flex', gap: '0.5rem' }

const backBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#2d6a4f', fontSize: '1rem',
  cursor: 'pointer', padding: '0.25rem 0',
}

const editBtnStyle: React.CSSProperties = {
  background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6,
  padding: '0.4rem 0.8rem', fontSize: '0.85rem', cursor: 'pointer',
}

const netRowStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '0.6rem 1rem', background: '#fff', border: '1px solid #ddd',
  borderRadius: 8, marginBottom: '0.4rem', fontSize: '1rem',
}

const deleteNetBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', color: '#c44',
  fontSize: '0.9rem', padding: '0.25rem',
}
