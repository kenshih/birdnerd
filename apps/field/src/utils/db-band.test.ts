import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetDB, saveRecord, saveBand, getRecordsByBand, getAllRecords } from '../db'
import type { BirdRecord, Band } from '@birdnerd/shared'

vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

const now = new Date().toISOString()

function makeRecord(overrides: Partial<BirdRecord> = {}): BirdRecord {
  return {
    id: `rec-${Math.random().toString(36).slice(2)}`,
    sessionId: 'session-1',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeBand(overrides: Partial<Band> = {}): Band {
  return {
    id: `band-${Math.random().toString(36).slice(2)}`,
    bandNumber: `1154-${Math.floor(Math.random() * 99999).toString().padStart(5, '0')}`,
    status: 'available',
    bandSize: '1B',
    bandType: 'Standard',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(() => resetDB())

describe('getRecordsByBand', () => {
  it('returns records linked to a band', async () => {
    const band = makeBand({ id: 'band-1' })
    await saveBand(band)
    const r1 = makeRecord({ id: 'rec-1', bandId: 'band-1' })
    const r2 = makeRecord({ id: 'rec-2', bandId: 'band-1' })
    await saveRecord(r1)
    await saveRecord(r2)

    const results = await getRecordsByBand('band-1')
    expect(results).toHaveLength(2)
    expect(results.map(r => r.id)).toEqual(expect.arrayContaining(['rec-1', 'rec-2']))
  })

  it('returns empty array when no records reference the band', async () => {
    const band = makeBand({ id: 'band-no-records' })
    await saveBand(band)
    const results = await getRecordsByBand('band-no-records')
    expect(results).toHaveLength(0)
  })

  it('does not return records belonging to a different band', async () => {
    await saveBand(makeBand({ id: 'band-a' }))
    await saveBand(makeBand({ id: 'band-b' }))
    await saveRecord(makeRecord({ id: 'rec-a', bandId: 'band-a' }))
    await saveRecord(makeRecord({ id: 'rec-b', bandId: 'band-b' }))

    const results = await getRecordsByBand('band-a')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('rec-a')
  })

  it('does not return unbanded records', async () => {
    await saveRecord(makeRecord({ id: 'rec-unbanded', bandId: undefined }))
    // bandId undefined — should not appear in any band query
    const results = await getRecordsByBand('band-x')
    expect(results).toHaveLength(0)
  })
})

describe('getAllRecords', () => {
  it('returns all records across sessions and bands', async () => {
    await saveRecord(makeRecord({ id: 'rec-1', sessionId: 'session-1' }))
    await saveRecord(makeRecord({ id: 'rec-2', sessionId: 'session-2' }))
    await saveRecord(makeRecord({ id: 'rec-3', sessionId: 'session-1' }))

    const results = await getAllRecords()
    expect(results.map(r => r.id)).toEqual(expect.arrayContaining(['rec-1', 'rec-2', 'rec-3']))
  })

  it('returns only records that were explicitly saved', async () => {
    const r = makeRecord({ id: 'only-rec' })
    await saveRecord(r)
    const results = await getAllRecords()
    expect(results.some(rec => rec.id === 'only-rec')).toBe(true)
  })
})
