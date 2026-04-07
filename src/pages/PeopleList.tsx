import { useState, useEffect } from 'react'
import type { Person, Bander, BanderRole } from '../types'
import { getPeople, savePerson, deletePerson, getBanders, saveBander } from '../db'
import PageHeader from '../components/PageHeader'
import { btnStyle, labelStyle, inputStyle, rowStyle } from '../styles/theme'
import { Card } from '../components/Card'

interface Props {
  onSelectPerson: (person: Person) => void
  onHome: () => void
}

const ROLES: BanderRole[] = ['Master Bander', 'Sub-permittee', 'Bander', 'Trainee']

function generateId(): string {
  return `person-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function PeopleList({ onSelectPerson, onHome }: Props) {
  const [people, setPeople] = useState<Person[]>([])
  const [banderMap, setBanderMap] = useState<Record<string, Bander>>({})
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState(emptyForm())

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const allPeople = await getPeople()
    allPeople.sort((a, b) => a.name.localeCompare(b.name))
    setPeople(allPeople)

    const allBanders = await getBanders()
    const map: Record<string, Bander> = {}
    for (const b of allBanders) {
      map[b.personId] = b
    }
    setBanderMap(map)
  }

  function emptyForm() {
    return { name: '', initials: '', role: 'Bander' as BanderRole, makeBander: true }
  }

  async function handleCreate() {
    if (!form.name.trim() || !form.initials.trim()) return
    const now = new Date().toISOString()
    const person: Person = {
      id: generateId(),
      name: form.name.trim(),
      initials: form.initials.trim().toUpperCase(),
      active: true,
      createdAt: now,
      updatedAt: now,
    }
    await savePerson(person)

    if (form.makeBander) {
      const bander: Bander = {
        id: `bander-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        personId: person.id,
        role: form.role,
        createdAt: now,
        updatedAt: now,
      }
      await saveBander(bander)
    }

    await loadData()
    setForm(emptyForm())
    setShowNew(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this person and their bander role?')) return
    await deletePerson(id)
    await loadData()
  }


  return (
    <div style={{ padding: '1rem', maxWidth: 500, margin: '0 auto' }}>
      <PageHeader title="People" onHome={onHome} />

      <button onClick={() => setShowNew(true)} style={btnStyle('#2d6a4f')}>
        + New Person
      </button>

      {showNew && (
        <Card>
          <h3 style={{ marginTop: 0 }}>New Person</h3>
          <div style={rowStyle}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Name *</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Hallie Daly"
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Initials *</label>
              <input
                value={form.initials}
                onChange={e => setForm({ ...form, initials: e.target.value })}
                placeholder="e.g. HD"
                maxLength={3}
                style={inputStyle}
              />
            </div>
          </div>

          <label style={{ ...labelStyle, marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={form.makeBander}
              onChange={e => setForm({ ...form, makeBander: e.target.checked })}
            />
            Add as Bander
          </label>

          {form.makeBander && (
            <div style={{ marginTop: '0.5rem' }}>
              <label style={labelStyle}>Bander Role</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value as BanderRole })}
                style={inputStyle}
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <button onClick={handleCreate} style={btnStyle('#2d6a4f')}>Create</button>
            <button onClick={() => { setShowNew(false); setForm(emptyForm()) }} style={btnStyle('#888')}>Cancel</button>
          </div>
        </Card>
      )}

      <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
        {people.map(person => {
          const bander = banderMap[person.id]
          return (
            <li key={person.id} style={{ marginBottom: '0.5rem' }}>
              <div style={personRowStyle}>
                <button onClick={() => onSelectPerson(person)} style={personBtnStyle}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{person.initials}</span>
                    <span style={{ color: '#555', fontSize: '0.85rem', marginLeft: '0.5rem' }}>{person.name}</span>
                    {!person.active && <span style={{ color: '#c44', fontSize: '0.75rem', marginLeft: '0.5rem' }}>(inactive)</span>}
                  </div>
                  <span style={{ color: '#888', fontSize: '0.8rem' }}>
                    {bander ? bander.role : 'No role'}
                  </span>
                </button>
                <button onClick={() => handleDelete(person.id)} style={deleteBtnStyle} aria-label="Delete">&#x2715;</button>
              </div>
            </li>
          )
        })}
        {people.length === 0 && !showNew && (
          <li style={{ color: '#888', textAlign: 'center', marginTop: '2rem' }}>
            No people yet. Create one to get started.
          </li>
        )}
      </ul>
    </div>
  )
}

const personRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '0.5rem',
}

const personBtnStyle: React.CSSProperties = {
  flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '0.75rem 1rem', background: '#fff', border: '1px solid #ddd',
  borderRadius: 8, cursor: 'pointer', fontSize: '1rem', textAlign: 'left',
}

const deleteBtnStyle: React.CSSProperties = {
  background: 'none', border: '1px solid #ddd', borderRadius: 8,
  padding: '0.75rem 0.75rem', cursor: 'pointer', color: '#c44', fontSize: '0.9rem',
}

