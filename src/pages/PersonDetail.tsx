import { useState, useEffect } from 'react'
import type { Person, Bander, BanderRole } from '../types'
import { savePerson, getBanderByPerson, saveBander, deleteBander } from '../db'
import PageHeader from '../components/PageHeader'

interface Props {
  person: Person
  onBack: () => void
  onPersonUpdated: () => void
  onHome: () => void
}

const ROLES: BanderRole[] = ['Master Bander', 'Sub-permittee', 'Bander', 'Trainee']

export default function PersonDetail({ person, onBack, onPersonUpdated, onHome }: Props) {
  const [bander, setBander] = useState<Bander | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(personToForm(person))

  useEffect(() => {
    loadBander()
  }, [person.id])

  async function loadBander() {
    const b = await getBanderByPerson(person.id)
    setBander(b ?? null)
  }

  function personToForm(p: Person) {
    return { name: p.name, initials: p.initials, active: p.active }
  }

  async function handleSave() {
    const updated: Person = {
      ...person,
      name: form.name.trim(),
      initials: form.initials.trim().toUpperCase(),
      active: form.active,
      updatedAt: new Date().toISOString(),
    }
    await savePerson(updated)
    setEditing(false)
    onPersonUpdated()
  }

  async function handleAddBander(role: BanderRole) {
    const now = new Date().toISOString()
    const newBander: Bander = {
      id: `bander-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      personId: person.id,
      role,
      createdAt: now,
      updatedAt: now,
    }
    await saveBander(newBander)
    await loadBander()
  }

  async function handleUpdateRole(role: BanderRole) {
    if (!bander) return
    const updated: Bander = {
      ...bander,
      role,
      updatedAt: new Date().toISOString(),
    }
    await saveBander(updated)
    await loadBander()
  }

  async function handleRemoveBander() {
    if (!bander) return
    if (!confirm('Remove bander role from this person?')) return
    await deleteBander(bander.id)
    setBander(null)
  }

  return (
    <div style={{ padding: '1rem', maxWidth: 500, margin: '0 auto' }}>
      <PageHeader title={`${person.initials} — ${person.name}`} onBack={onBack} onHome={onHome} />

      {/* Person info */}
      {editing ? (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Edit Person</h3>
          <div style={rowStyle}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Initials</label>
              <input value={form.initials} onChange={e => setForm({ ...form, initials: e.target.value })} maxLength={3} style={inputStyle} />
            </div>
          </div>

          <label style={{ ...labelStyle, marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => setForm({ ...form, active: e.target.checked })}
            />
            Active
          </label>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button onClick={handleSave} style={btnStyle('#2d6a4f')}>Save</button>
            <button onClick={() => { setEditing(false); setForm(personToForm(person)) }} style={btnStyle('#888')}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{person.name}</div>
              <div style={{ color: '#555', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                Initials: {person.initials}
              </div>
              <div style={{ color: person.active ? '#2d6a4f' : '#c44', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                {person.active ? 'Active' : 'Inactive'}
              </div>
            </div>
            <button onClick={() => setEditing(true)} style={editBtnStyle}>Edit</button>
          </div>
        </div>
      )}

      {/* Bander role */}
      <div style={{ marginTop: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', margin: '0 0 0.75rem' }}>Bander Role</h2>

        {bander ? (
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <label style={labelStyle}>Role</label>
                <select
                  value={bander.role}
                  onChange={e => handleUpdateRole(e.target.value as BanderRole)}
                  style={inputStyle}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <button onClick={handleRemoveBander} style={{ ...btnStyle('#c44'), marginTop: '1rem' }}>
                Remove
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ color: '#888', fontSize: '0.9rem', marginTop: 0 }}>
              This person is not a bander. Add a bander role to include them in bander dropdowns.
            </p>
            <button onClick={() => handleAddBander('Bander')} style={btnStyle('#2d6a4f')}>
              + Add Bander Role
            </button>
          </div>
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

const editBtnStyle: React.CSSProperties = {
  background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6,
  padding: '0.4rem 0.8rem', fontSize: '0.85rem', cursor: 'pointer',
}
