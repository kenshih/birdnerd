import { useState, useEffect } from 'react'
import type { Location, Net } from '../types'
import { getNetsByLocation, saveNet, saveLocation } from '../db'
import PageHeader from '../components/PageHeader'
import { btnStyle, cardStyle, labelStyle, inputStyle, rowStyle } from '../styles/theme'

interface Props {
  location: Location
  onBack: () => void
  onLocationUpdated: () => void
  onHome: () => void
}

function generateId(): string {
  return `net-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function LocationDetail({ location, onBack, onLocationUpdated, onHome }: Props) {
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
      active: true,
      createdAt: now,
      updatedAt: now,
    }
    await saveNet(net)
    setNewLabel('')
    await loadNets()
  }

  async function handleToggleNet(net: Net) {
    await saveNet({ ...net, active: !net.active, updatedAt: new Date().toISOString() })
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
      <PageHeader title={location.banderLocationId} onBack={onBack} onHome={onHome} />

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
        <h2 style={{ fontSize: '1.1rem', margin: '0 0 0.75rem' }}>
          Nets ({nets.filter(n => n.active !== false).length} active{nets.some(n => n.active === false) ? `, ${nets.filter(n => n.active === false).length} inactive` : ''})
        </h2>

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
              <li key={net.id} style={{ ...netRowStyle, opacity: net.active !== false ? 1 : 0.5 }}>
                <span style={{ fontWeight: 600 }}>
                  {net.label}
                  {net.active === false && <span style={{ fontWeight: 400, color: '#888', marginLeft: '0.5rem', fontSize: '0.8rem' }}>(inactive)</span>}
                </span>
                <button
                  onClick={() => handleToggleNet(net)}
                  style={net.active !== false ? deactivateNetBtnStyle : reactivateNetBtnStyle}
                  aria-label={net.active !== false ? 'Remove from operation' : 'Reactivate'}
                >
                  {net.active !== false ? 'Remove' : 'Reactivate'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
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

const deactivateNetBtnStyle: React.CSSProperties = {
  background: 'none', border: '1px solid #c44', borderRadius: 4, cursor: 'pointer',
  color: '#c44', fontSize: '0.75rem', padding: '0.2rem 0.5rem',
}

const reactivateNetBtnStyle: React.CSSProperties = {
  background: 'none', border: '1px solid #2d6a4f', borderRadius: 4, cursor: 'pointer',
  color: '#2d6a4f', fontSize: '0.75rem', padding: '0.2rem 0.5rem',
}
