import { useState, useEffect, useMemo } from 'react'
import type { Band, BandType, Session } from '@birdnerd/shared'
import { getBands, saveBands, getBandByNumber, getAllRecords } from '../db'
import { BAND_SIZE_CODES, BAND_TYPE_CODES } from '../data/codes'
import PageHeader from '../components/PageHeader'
import { labelStyle, inputStyle } from '../styles/theme'
import { CardElevated } from '../components/Card'
import BandHistoryView from '../components/BandHistoryView'

interface Props {
  onHome: () => void
  onSelectSession: (session: Session) => void
}

type View = 'overview' | 'list' | 'add' | 'history'

function generateId(): string {
  return `band-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function BandInventory({ onHome, onSelectSession }: Props) {
  const [bands, setBands] = useState<Band[]>([])
  const [lastSeenMap, setLastSeenMap] = useState<Map<string, string>>(new Map())
  const [view, setView] = useState<View>('overview')
  const [selectedBand, setSelectedBand] = useState<Band | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadBands() }, [])

  async function loadBands() {
    const [all, records] = await Promise.all([getBands(), getAllRecords()])
    setBands(all)
    // Build lastSeen map: bandId → most recent session date (via record.date or record.createdAt)
    const map = new Map<string, string>()
    for (const r of records) {
      if (!r.bandId) continue
      const date = r.date ?? r.createdAt.slice(0, 10)
      const existing = map.get(r.bandId)
      if (!existing || date > existing) map.set(r.bandId, date)
    }
    setLastSeenMap(map)
    setLoading(false)
  }

  if (loading) return <div style={{ padding: '1rem' }}>Loading...</div>

  if (view === 'history' && selectedBand) {
    return (
      <BandHistoryView
        band={selectedBand}
        onBack={() => setView('list')}
        onHome={onHome}
        onSelectSession={onSelectSession}
      />
    )
  }

  if (view === 'list') {
    return (
      <BandList
        bands={bands}
        lastSeenMap={lastSeenMap}
        onBack={() => setView('overview')}
        onHome={onHome}
        onSelectBand={band => { setSelectedBand(band); setView('history') }}
      />
    )
  }

  if (view === 'add') {
    return (
      <AddBands
        onBack={() => setView('overview')}
        onHome={onHome}
        onAdded={() => { loadBands(); setView('overview') }}
      />
    )
  }

  // Overview
  const stats = computeStats(bands)

  return (
    <div style={{ padding: '1rem', maxWidth: 500, margin: '0 auto' }}>
      <PageHeader title="Band Inventory" onHome={onHome} />

      <CardElevated>
        <div style={statRowStyle}>
          <span>Total Bands</span>
          <strong>{bands.length}</strong>
        </div>
        <div style={statRowStyle}>
          <span>Available</span>
          <strong style={{ color: '#2d6a4f' }}>{stats.available}</strong>
        </div>
        <div style={statRowStyle}>
          <span>Deployed</span>
          <strong style={{ color: '#1a73e8' }}>{stats.deployed}</strong>
        </div>
        <div style={statRowStyle}>
          <span>Destroyed / Lost / Replaced</span>
          <strong style={{ color: '#888' }}>{stats.other}</strong>
        </div>
      </CardElevated>

      {stats.bySize.length > 0 && (
        <CardElevated>
          <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>By Size</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '0.25rem 0.75rem', fontSize: '0.85rem' }}>
            <span style={{ fontWeight: 600, color: '#666' }}>Size</span>
            <span style={{ fontWeight: 600, color: '#666' }}>Avail</span>
            <span style={{ fontWeight: 600, color: '#666' }}>Deployed</span>
            {stats.bySize.map(s => (
              <SizeRow key={s.size} {...s} />
            ))}
          </div>
        </CardElevated>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <button onClick={() => setView('list')} style={actionBtnStyle('#2d6a4f')}>View All Bands</button>
        <button onClick={() => setView('add')} style={actionBtnStyle('#1a73e8')}>Add Bands</button>
      </div>
    </div>
  )
}

function SizeRow({ size, available, deployed }: { size: string; available: number; deployed: number }) {
  return (
    <>
      <span style={{ fontWeight: 500 }}>{size}</span>
      <span style={{ color: '#2d6a4f' }}>{available}</span>
      <span style={{ color: '#1a73e8' }}>{deployed}</span>
    </>
  )
}

function computeStats(bands: Band[]) {
  let available = 0, deployed = 0, other = 0
  const sizeMap = new Map<string, { available: number; deployed: number }>()

  for (const b of bands) {
    if (b.status === 'available') available++
    else if (b.status === 'deployed') deployed++
    else other++

    const entry = sizeMap.get(b.bandSize) ?? { available: 0, deployed: 0 }
    if (b.status === 'available') entry.available++
    else if (b.status === 'deployed') entry.deployed++
    sizeMap.set(b.bandSize, entry)
  }

  // Sort by BBL size code order
  const sizeOrder = BAND_SIZE_CODES.map(c => c.code)
  const bySize = Array.from(sizeMap.entries())
    .map(([size, counts]) => ({ size, ...counts }))
    .sort((a, b) => sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size))

  return { available, deployed, other, bySize }
}

// ─── Band List View ──────────────────────────────────────────────────

function BandList({ bands, lastSeenMap, onBack, onHome, onSelectBand }: {
  bands: Band[]
  lastSeenMap: Map<string, string>
  onBack: () => void
  onHome: () => void
  onSelectBand: (band: Band) => void
}) {
  const [search, setSearch] = useState('')
  const [filterSize, setFilterSize] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortBy, setSortBy] = useState<'last-seen' | 'band-number'>('last-seen')

  const filtered = useMemo(() => {
    return bands.filter(b => {
      if (search && !b.bandNumber.includes(search)) return false
      if (filterSize && b.bandSize !== filterSize) return false
      if (filterStatus && b.status !== filterStatus) return false
      return true
    }).sort((a, b) => {
      if (sortBy === 'last-seen') {
        const da = lastSeenMap.get(a.id) ?? ''
        const db2 = lastSeenMap.get(b.id) ?? ''
        if (db2 !== da) return db2.localeCompare(da) // most recent first
      }
      return a.bandNumber.localeCompare(b.bandNumber)
    })
  }, [bands, search, filterSize, filterStatus, sortBy, lastSeenMap])

  // Collect unique sizes present in data
  const sizesInUse = useMemo(() => {
    const s = new Set(bands.map(b => b.bandSize))
    return BAND_SIZE_CODES.filter(c => s.has(c.code))
  }, [bands])

  return (
    <div style={{ padding: '1rem', maxWidth: 500, margin: '0 auto' }}>
      <PageHeader title="All Bands" onBack={onBack} onHome={onHome} />

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search band #..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 120 }}
        />
        <select value={filterSize} onChange={e => setFilterSize(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="">All sizes</option>
          {sizesInUse.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="">All statuses</option>
          <option value="available">Available</option>
          <option value="deployed">Deployed</option>
          <option value="destroyed">Destroyed</option>
          <option value="lost">Lost</option>
          <option value="replaced">Replaced</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as 'last-seen' | 'band-number')} style={{ ...inputStyle, width: 'auto' }}>
          <option value="last-seen">Last seen</option>
          <option value="band-number">Band #</option>
        </select>
      </div>

      <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.5rem' }}>
        {filtered.length} band{filtered.length !== 1 ? 's' : ''}
      </div>

      {filtered.length === 0 ? (
        <div style={{ color: '#888', padding: '1rem', textAlign: 'center' }}>No bands match filters.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {filtered.slice(0, 200).map(b => {
            const lastSeen = lastSeenMap.get(b.id)
            return (
              <button key={b.id} style={bandRowStyle} onClick={() => onSelectBand(b)}>
                <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>{b.bandNumber}</span>
                <span style={{ fontSize: '0.8rem', color: '#666' }}>
                  {b.bandSize} · {b.bandType}
                </span>
                <span style={{ ...statusChipStyle, background: statusColor(b.status) }}>
                  {b.status}
                </span>
                {b.currentSpecies && (
                  <span style={{ fontSize: '0.8rem', color: '#1a73e8' }}>{b.currentSpecies}</span>
                )}
                {lastSeen && (
                  <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: 'auto' }}>{lastSeen}</span>
                )}
              </button>
            )
          })}
          {filtered.length > 200 && (
            <div style={{ textAlign: 'center', color: '#888', fontSize: '0.8rem', padding: '0.5rem' }}>
              Showing first 200 of {filtered.length}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function statusColor(status: string): string {
  switch (status) {
    case 'available': return '#d4edda'
    case 'deployed': return '#cce5ff'
    case 'destroyed': return '#f8d7da'
    case 'lost': return '#fff3cd'
    case 'replaced': return '#e2e3e5'
    default: return '#e2e3e5'
  }
}

// ─── Add Bands (Bulk) ────────────────────────────────────────────────

function AddBands({ onBack, onHome, onAdded }: { onBack: () => void; onHome: () => void; onAdded: () => void }) {
  const [prefix, setPrefix] = useState('')
  const [startSuffix, setStartSuffix] = useState('')
  const [endSuffix, setEndSuffix] = useState('')
  const [bandSize, setBandSize] = useState('')
  const [bandType, setBandType] = useState<BandType>('Standard')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const count = useMemo(() => {
    const s = parseInt(startSuffix)
    const e = parseInt(endSuffix)
    if (isNaN(s) || isNaN(e) || e < s) return 0
    return e - s + 1
  }, [startSuffix, endSuffix])

  const preview = useMemo(() => {
    if (!prefix || !startSuffix || !endSuffix || count === 0) return ''
    return `${prefix}-${startSuffix} to ${prefix}-${endSuffix} (${count} band${count !== 1 ? 's' : ''})`
  }, [prefix, startSuffix, endSuffix, count])

  async function handleAdd() {
    setError('')

    if (!prefix || prefix.length !== 4 || !/^\d{4}$/.test(prefix)) {
      setError('Prefix must be exactly 4 digits'); return
    }
    if (!startSuffix || !/^\d{5,6}$/.test(startSuffix)) {
      setError('Start suffix must be 5–6 digits'); return
    }
    if (!endSuffix || !/^\d{5,6}$/.test(endSuffix)) {
      setError('End suffix must be 5–6 digits'); return
    }
    if (startSuffix.length !== endSuffix.length) {
      setError('Start and end suffix must have the same number of digits'); return
    }
    const start = parseInt(startSuffix)
    const end = parseInt(endSuffix)
    if (end < start) {
      setError('End must be >= start'); return
    }
    if (count > 500) {
      setError('Maximum 500 bands per batch'); return
    }
    if (!bandSize) {
      setError('Please select a band size'); return
    }

    setSaving(true)

    // Check for duplicates
    const suffixLen = startSuffix.length
    for (let i = start; i <= end; i++) {
      const num = `${prefix}-${String(i).padStart(suffixLen, '0')}`
      const existing = await getBandByNumber(num)
      if (existing) {
        setError(`Band ${num} already exists in inventory`)
        setSaving(false)
        return
      }
    }

    const now = new Date().toISOString()
    const newBands: Band[] = []
    for (let i = start; i <= end; i++) {
      newBands.push({
        id: generateId(),
        bandNumber: `${prefix}-${String(i).padStart(suffixLen, '0')}`,
        status: 'available',
        bandSize,
        bandType,
        createdAt: now,
        updatedAt: now,
      })
    }

    await saveBands(newBands)
    setSaving(false)
    onAdded()
  }

  return (
    <div style={{ padding: '1rem', maxWidth: 500, margin: '0 auto' }}>
      <PageHeader title="Add Bands" onBack={onBack} onHome={onHome} />

      <CardElevated>
        <label style={labelStyle}>Prefix (4-digit)</label>
        <input
          type="text"
          value={prefix}
          onChange={e => setPrefix(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="e.g. 1154"
          style={inputStyle}
          inputMode="numeric"
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <div>
            <label style={labelStyle}>Start Suffix</label>
            <input
              type="text"
              value={startSuffix}
              onChange={e => setStartSuffix(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="e.g. 81501"
              style={inputStyle}
              inputMode="numeric"
            />
          </div>
          <div>
            <label style={labelStyle}>End Suffix</label>
            <input
              type="text"
              value={endSuffix}
              onChange={e => setEndSuffix(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="e.g. 81550"
              style={inputStyle}
              inputMode="numeric"
            />
          </div>
        </div>

        <label style={labelStyle}>Band Size</label>
        <select value={bandSize} onChange={e => setBandSize(e.target.value)} style={inputStyle}>
          <option value="">— Select size —</option>
          {BAND_SIZE_CODES.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
        </select>

        <label style={labelStyle}>Band Type</label>
        <select value={bandType} onChange={e => setBandType(e.target.value as BandType)} style={inputStyle}>
          {BAND_TYPE_CODES.map(t => <option key={t.code} value={t.code}>{t.code}</option>)}
        </select>

        {preview && (
          <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#f0f7f4', borderRadius: 6, fontSize: '0.85rem' }}>
            Preview: {preview}
          </div>
        )}

        {error && (
          <div style={{ marginTop: '0.5rem', color: '#c0392b', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <button
          onClick={handleAdd}
          disabled={saving || count === 0 || !bandSize}
          style={{ ...actionBtnStyle(saving ? '#888' : '#2d6a4f'), width: '100%', marginTop: '0.75rem' }}
        >
          {saving ? 'Adding...' : `Add ${count} Band${count !== 1 ? 's' : ''}`}
        </button>
      </CardElevated>
    </div>
  )
}

// ─── Shared styles ───────────────────────────────────────────────────

const statRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '0.3rem 0',
  fontSize: '0.9rem',
  borderBottom: '1px solid #eee',
}

const bandRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.4rem 0.5rem',
  background: '#fff',
  borderRadius: 6,
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  width: '100%',
}

const statusChipStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  padding: '0.1rem 0.4rem',
  borderRadius: 4,
  fontWeight: 500,
  marginLeft: 'auto',
}

const actionBtnStyle = (bg: string): React.CSSProperties => ({
  padding: '0.6rem 1rem',
  background: bg,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '0.9rem',
  textAlign: 'center',
})
