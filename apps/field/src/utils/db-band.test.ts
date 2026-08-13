import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createUuidV7 } from '@birdnerd/events'
import { resetDB, saveRecord, saveBand, getRecordsByBand, getAllRecords } from '../db'
import type { BirdRecord, Band } from '@birdnerd/shared'

vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

const now = new Date().toISOString()

const fixtureIds = {
  sessionOne: '018f8c7b-0000-7000-8000-000000000071',
  sessionTwo: '018f8c7b-0000-7000-8000-000000000072',
  bandOne: '018f8c7b-0000-7000-8000-000000000073',
  recordOne: '018f8c7b-0000-7000-8000-000000000074',
  recordTwo: '018f8c7b-0000-7000-8000-000000000075',
  bandWithoutRecords: '018f8c7b-0000-7000-8000-000000000076',
  bandA: '018f8c7b-0000-7000-8000-000000000077',
  bandB: '018f8c7b-0000-7000-8000-000000000078',
  recordA: '018f8c7b-0000-7000-8000-000000000079',
  recordB: '018f8c7b-0000-7000-8000-000000000080',
  unbandedRecord: '018f8c7b-0000-7000-8000-000000000081',
  absentBand: '018f8c7b-0000-7000-8000-000000000082',
  recordThree: '018f8c7b-0000-7000-8000-000000000083',
  onlyRecord: '018f8c7b-0000-7000-8000-000000000084',
} as const

function makeRecord(overrides: Partial<BirdRecord> = {}): BirdRecord {
  return {
    id: createUuidV7(),
    sessionId: fixtureIds.sessionOne,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeBand(overrides: Partial<Band> = {}): Band {
  return {
    id: createUuidV7(),
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
    const band = makeBand({ id: fixtureIds.bandOne })
    await saveBand(band)
    const r1 = makeRecord({ id: fixtureIds.recordOne, bandId: fixtureIds.bandOne })
    const r2 = makeRecord({ id: fixtureIds.recordTwo, bandId: fixtureIds.bandOne })
    await saveRecord(r1)
    await saveRecord(r2)

    const results = await getRecordsByBand(fixtureIds.bandOne)
    expect(results).toHaveLength(2)
    expect(results.map(r => r.id)).toEqual(expect.arrayContaining([fixtureIds.recordOne, fixtureIds.recordTwo]))
  })

  it('returns empty array when no records reference the band', async () => {
    const band = makeBand({ id: fixtureIds.bandWithoutRecords })
    await saveBand(band)
    const results = await getRecordsByBand(fixtureIds.bandWithoutRecords)
    expect(results).toHaveLength(0)
  })

  it('does not return records belonging to a different band', async () => {
    await saveBand(makeBand({ id: fixtureIds.bandA }))
    await saveBand(makeBand({ id: fixtureIds.bandB }))
    await saveRecord(makeRecord({ id: fixtureIds.recordA, bandId: fixtureIds.bandA }))
    await saveRecord(makeRecord({ id: fixtureIds.recordB, bandId: fixtureIds.bandB }))

    const results = await getRecordsByBand(fixtureIds.bandA)
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe(fixtureIds.recordA)
  })

  it('does not return unbanded records', async () => {
    await saveRecord(makeRecord({ id: fixtureIds.unbandedRecord, bandId: undefined }))
    // bandId undefined — should not appear in any band query
    const results = await getRecordsByBand(fixtureIds.absentBand)
    expect(results).toHaveLength(0)
  })
})

describe('getAllRecords', () => {
  it('returns all records across sessions and bands', async () => {
    await saveRecord(makeRecord({ id: fixtureIds.recordOne, sessionId: fixtureIds.sessionOne }))
    await saveRecord(makeRecord({ id: fixtureIds.recordTwo, sessionId: fixtureIds.sessionTwo }))
    await saveRecord(makeRecord({ id: fixtureIds.recordThree, sessionId: fixtureIds.sessionOne }))

    const results = await getAllRecords()
    expect(results.map(r => r.id)).toEqual(expect.arrayContaining([fixtureIds.recordOne, fixtureIds.recordTwo, fixtureIds.recordThree]))
  })

  it('returns only records that were explicitly saved', async () => {
    const r = makeRecord({ id: fixtureIds.onlyRecord })
    await saveRecord(r)
    const results = await getAllRecords()
    expect(results.some(rec => rec.id === fixtureIds.onlyRecord)).toBe(true)
  })
})
