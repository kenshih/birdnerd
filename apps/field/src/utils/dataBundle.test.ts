import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BUNDLE_VERSION } from '../data/bundle-schema'
import type { DataBundle } from '../data/bundle-schema'
import { validateBundle, exportDataBundle, importDataBundle } from './dataBundle'
import { getDB, resetDB, saveLocation, saveNet, savePerson, saveBander, saveSession, saveRecord, saveSessionBanderLog } from '../db'
import type { Location, Net, Person, Bander, Session, SessionBanderLog, BirdRecord } from '@birdnerd/shared'

// Mock fetch so getDB()'s seed check doesn't try to hit the network
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

const now = new Date().toISOString()

function makeBundle(overrides: Partial<DataBundle> = {}): DataBundle {
  return {
    version: BUNDLE_VERSION,
    exportedAt: now,
    locations: [],
    nets: [],
    people: [],
    banders: [],
    sessions: [],
    sessionBanderLogs: [],
    sessionNetLogs: [],
    bands: [],
    records: [],
    photos: [],
    ...overrides,
  }
}

const sampleLocation: Location = {
  id: 'loc-1', banderLocationId: 'TEST', bblLocationId: null,
  name: 'Test Station', latitude: 37.0, longitude: -122.0,
  country: 'US', stateProvince: 'CA', remarks: '',
  createdAt: now, updatedAt: now,
}

const sampleNet: Net = {
  id: 'net-1', locationId: 'loc-1', label: '1', active: true,
  createdAt: now, updatedAt: now,
}

const samplePerson: Person = {
  id: 'person-1', name: 'Test Bander', initials: 'TB', active: true,
  createdAt: now, updatedAt: now,
}

const sampleBander: Bander = {
  id: 'bander-1', personId: 'person-1', role: 'Bander',
  createdAt: now, updatedAt: now,
}

const sampleSession: Session = {
  id: 'sess-1', locationId: 'loc-1', date: '2026-03-21', createdAt: now, updatedAt: now,
}

const sampleSessionBanderLog: SessionBanderLog = {
  id: 'sbl-1', sessionId: 'sess-1', banderId: 'bander-1', createdAt: now, updatedAt: now,
}

const sampleRecord: BirdRecord = {
  id: 'rec-1', sessionId: 'sess-1', bandNumber: '1234-56789',
  speciesCode: 'SOSP', age: 'AHY', sex: 'M',
  createdAt: now, updatedAt: now,
}

// ─── Validation (pure function, no IndexedDB) ────────────────────────

describe('validateBundle', () => {
  it('accepts a valid bundle', () => {
    expect(validateBundle(makeBundle())).toBeNull()
  })

  it('accepts a bundle with data', () => {
    const bundle = makeBundle({
      locations: [sampleLocation],
      nets: [sampleNet],
      people: [samplePerson],
      banders: [sampleBander],
      sessions: [sampleSession],
      records: [sampleRecord],
    })
    expect(validateBundle(bundle)).toBeNull()
  })

  it('rejects null', () => {
    expect(validateBundle(null)).toMatch(/not a JSON object/)
  })

  it('rejects non-object', () => {
    expect(validateBundle('hello')).toMatch(/not a JSON object/)
  })

  it('rejects missing version', () => {
    const { version: _, ...noVersion } = makeBundle()
    expect(validateBundle(noVersion)).toMatch(/missing version/)
  })

  it('rejects newer version', () => {
    const bundle = makeBundle({ version: BUNDLE_VERSION + 1 })
    expect(validateBundle(bundle)).toMatch(/newer than this app/)
  })

  it('accepts older version', () => {
    // version 1 should always be valid (we're at v1 now, but the pattern holds)
    const bundle = makeBundle({ version: 1 })
    expect(validateBundle(bundle)).toBeNull()
  })

  it('rejects missing entity arrays', () => {
    const bundle = makeBundle()
    delete (bundle as unknown as Record<string, unknown>).records
    expect(validateBundle(bundle)).toMatch(/missing or invalid "records"/)
  })

  it('rejects non-array entity', () => {
    const bundle = makeBundle() as unknown as Record<string, unknown>
    bundle.locations = 'not-an-array'
    expect(validateBundle(bundle)).toMatch(/missing or invalid "locations"/)
  })
})

// ─── Integration (uses fake-indexeddb) ────────────────────────────────

describe('export/import round-trip', () => {
  beforeEach(async () => {
    resetDB()
    // Delete the database so each test starts fresh
    indexedDB.deleteDatabase('birdnerd')
  })

  it('exports an empty database', async () => {
    const bundle = await exportDataBundle()
    expect(bundle.version).toBe(BUNDLE_VERSION)
    expect(bundle.exportedAt).toBeTruthy()
    expect(bundle.locations).toEqual([])
    expect(bundle.sessions).toEqual([])
    expect(bundle.records).toEqual([])
  })

  it('round-trips all entity types', async () => {
    // Populate the database
    await saveLocation(sampleLocation)
    await saveNet(sampleNet)
    await savePerson(samplePerson)
    await saveBander(sampleBander)
    await saveSession(sampleSession)
    await saveSessionBanderLog(sampleSessionBanderLog)
    await saveRecord(sampleRecord)

    // Export
    const bundle = await exportDataBundle()
    expect(bundle.locations).toHaveLength(1)
    expect(bundle.nets).toHaveLength(1)
    expect(bundle.people).toHaveLength(1)
    expect(bundle.banders).toHaveLength(1)
    expect(bundle.sessions).toHaveLength(1)
    expect(bundle.sessionBanderLogs).toHaveLength(1)
    expect(bundle.records).toHaveLength(1)

    // Reset and reimport
    resetDB()
    indexedDB.deleteDatabase('birdnerd')
    await importDataBundle(bundle)

    // Verify round-trip
    const db = await getDB()
    const locs = await db.getAll('locations')
    expect(locs).toHaveLength(1)
    expect(locs[0].id).toBe('loc-1')
    expect(locs[0].name).toBe('Test Station')

    const nets = await db.getAll('nets')
    expect(nets).toHaveLength(1)
    expect(nets[0].label).toBe('1')

    const people = await db.getAll('people')
    expect(people).toHaveLength(1)
    expect(people[0].initials).toBe('TB')

    const banders = await db.getAll('banders')
    expect(banders).toHaveLength(1)
    expect(banders[0].role).toBe('Bander')

    const sessions = await db.getAll('sessions')
    expect(sessions).toHaveLength(1)
    expect(sessions[0].locationId).toBe('loc-1')

    const sbls = await db.getAll('sessionBanderLogs')
    expect(sbls).toHaveLength(1)
    expect(sbls[0].banderId).toBe('bander-1')

    const records = await db.getAll('records')
    expect(records).toHaveLength(1)
    expect(records[0].speciesCode).toBe('SOSP')
  })

  it('import replaces existing data (does not merge)', async () => {
    // Pre-populate with one record
    await saveLocation(sampleLocation)
    await savePerson(samplePerson)

    // Import a bundle with different data
    const otherLocation: Location = {
      ...sampleLocation,
      id: 'loc-other',
      banderLocationId: 'OTHR',
      name: 'Other Station',
    }
    const bundle = makeBundle({ locations: [otherLocation] })
    await importDataBundle(bundle)

    // Should have only the imported location, not the original
    const db = await getDB()
    const locs = await db.getAll('locations')
    expect(locs).toHaveLength(1)
    expect(locs[0].id).toBe('loc-other')

    // People should be wiped too (bundle had empty people array)
    const people = await db.getAll('people')
    expect(people).toHaveLength(0)
  })

  it('import handles empty bundle gracefully', async () => {
    // Pre-populate
    await saveLocation(sampleLocation)
    await saveRecord(sampleRecord)

    // Import empty bundle
    await importDataBundle(makeBundle())

    const db = await getDB()
    expect(await db.count('locations')).toBe(0)
    expect(await db.count('records')).toBe(0)
  })

  it('round-trips bands', async () => {
    const { saveBand } = await import('../db')
    await saveBand({
      id: 'band-1', bandNumber: '1154-81501', status: 'available',
      bandSize: '1B', bandType: 'Standard', createdAt: now, updatedAt: now,
    })

    const bundle = await exportDataBundle()
    expect(bundle.bands).toHaveLength(1)
    expect(bundle.bands[0].bandNumber).toBe('1154-81501')

    resetDB()
    indexedDB.deleteDatabase('birdnerd')
    await importDataBundle(bundle)

    const db = await getDB()
    const bands = await db.getAll('bands')
    expect(bands).toHaveLength(1)
    expect(bands[0].bandSize).toBe('1B')
  })

  it('migrates v2 bundle (adds empty bands)', async () => {
    const v2Bundle = {
      version: 2,
      exportedAt: now,
      locations: [sampleLocation],
      nets: [sampleNet],
      people: [],
      banders: [],
      sessions: [],
      sessionBanderLogs: [],
      sessionNetLogs: [],
      records: [],
    }

    expect(validateBundle(v2Bundle)).toBeNull()
    await importDataBundle(v2Bundle as unknown as DataBundle)

    const db = await getDB()
    const bands = await db.getAll('bands')
    expect(bands).toHaveLength(0)
  })

  it('migrates v1 bundle (station → locationId)', async () => {
    // Create a v1-style bundle with station field on session
    const v1Bundle = {
      version: 1,
      exportedAt: now,
      locations: [sampleLocation],
      nets: [],
      people: [],
      banders: [],
      sessions: [{ id: 'sess-v1', station: 'TEST', date: '2026-01-01', createdAt: now }],
      records: [],
    }

    expect(validateBundle(v1Bundle)).toBeNull()
    await importDataBundle(v1Bundle as unknown as DataBundle)

    const db = await getDB()
    const sessions = await db.getAll('sessions')
    expect(sessions).toHaveLength(1)
    expect(sessions[0].locationId).toBe('loc-1') // mapped from station=TEST → location with banderLocationId=TEST
    expect((sessions[0] as unknown as Record<string, unknown>).station).toBeUndefined()
    expect(sessions[0].updatedAt).toBeTruthy()

    // sessionBanderLogs should be empty (didn't exist in v1)
    const sbls = await db.getAll('sessionBanderLogs')
    expect(sbls).toHaveLength(0)
  })
})
