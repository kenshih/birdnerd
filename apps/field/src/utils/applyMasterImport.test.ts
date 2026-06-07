import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  resetDB, getLocations, getSessions, getBands, getAllRecords,
  getAllSessionBanderLogs, getPeople, saveLocation, savePerson, saveBander,
} from '../db'
import { buildImportPlan, type ParsedSheet } from './masterSheetImport'
import { applyImportPlan } from './applyMasterImport'

vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

const HEADERS = [
  'Bander', 'Code IBP', 'Code BBL', 'Band Size', 'Band Number', 'Species Name', 'ALPHA Code',
  'Age NUMBER', 'How Aged BBL', 'WRP', 'Sex', 'How Sexed BBL', 'Wing', 'Body Mass', 'Status',
  'Month', 'Day', 'Year', 'Capture Time', 'Station', 'Net', 'Blood Sample BBL',
]

function sheet(rows: Record<string, string>[]): ParsedSheet {
  return {
    headers: HEADERS,
    rows: rows.map(r => { const f: Record<string, string> = {}; for (const h of HEADERS) f[h] = r[h] ?? ''; return f }),
  }
}

const cap = (over: Record<string, string> = {}): Record<string, string> => ({
  Bander: 'TS', 'Code BBL': '1', 'Band Size': '1B', 'Band Number': '142263301', 'ALPHA Code': 'CALT',
  'How Aged BBL': 'PL', Sex: 'M', Month: '4', Day: '19', Year: '2025', Station: 'GCFS', ...over,
})

const now = new Date().toISOString()

beforeEach(async () => {
  resetDB()
  indexedDB.deleteDatabase('birdnerd')
})

describe('applyImportPlan — fresh import', () => {
  it('creates a stub location, session, band, and record', async () => {
    const plan = buildImportPlan(sheet([cap()]))
    const summary = await applyImportPlan(plan)

    expect(summary).toMatchObject({ sessionsCreated: 1, bandsCreated: 1, recordsCreated: 1, locationsCreated: ['GCFS'] })

    const [locs, sess, bands, recs] = await Promise.all([getLocations(), getSessions(), getBands(), getAllRecords()])
    expect(locs.find(l => l.banderLocationId === 'GCFS')).toBeTruthy()
    expect(sess).toHaveLength(1)
    expect(bands[0]).toMatchObject({ bandNumber: '1422-63301', status: 'deployed', bandType: 'Standard' })
    expect(recs[0]).toMatchObject({ speciesCode: 'CALT', date: '2025-04-19' })
    // record links to the created session + band
    expect(recs[0]!.sessionId).toBe(sess[0]!.id)
    expect(recs[0]!.bandId).toBe(bands[0]!.id)
  })

  it('reuses an existing location instead of creating a stub', async () => {
    await saveLocation({
      id: 'loc-existing', banderLocationId: 'GCFS', bblLocationId: null, name: 'Galindo',
      latitude: 0, longitude: 0, country: 'USA', stateProvince: 'CA', remarks: '', createdAt: now, updatedAt: now,
    })
    const summary = await applyImportPlan(buildImportPlan(sheet([cap()])))
    expect(summary.locationsCreated).toEqual([])
    const sess = await getSessions()
    expect(sess[0]!.locationId).toBe('loc-existing')
  })
})

describe('applyImportPlan — no-clobber dedup', () => {
  it('skips everything on a second identical import', async () => {
    const plan = buildImportPlan(sheet([cap()]))
    await applyImportPlan(plan)
    const second = await applyImportPlan(buildImportPlan(sheet([cap()])))

    expect(second).toMatchObject({ sessionsCreated: 0, sessionsSkipped: 1, bandsCreated: 0, bandsSkipped: 1, recordsCreated: 0, recordsSkipped: 1 })
    expect(await getSessions()).toHaveLength(1)
    expect(await getBands()).toHaveLength(1)
    expect(await getAllRecords()).toHaveLength(1)
  })

  it('adds a new record to an existing session/band without duplicating them', async () => {
    await applyImportPlan(buildImportPlan(sheet([cap()])))
    // Same station-day + same band, different date-less detail won't dedup; use a new band same day.
    const summary = await applyImportPlan(buildImportPlan(sheet([cap({ 'Band Number': '142263302' })])))
    expect(summary).toMatchObject({ sessionsCreated: 0, sessionsSkipped: 1, bandsCreated: 1, recordsCreated: 1 })
    expect(await getSessions()).toHaveLength(1)
    expect(await getBands()).toHaveLength(2)
  })
})

describe('applyImportPlan — dry run', () => {
  it('computes the same counts without writing', async () => {
    const plan = buildImportPlan(sheet([cap()]))
    const summary = await applyImportPlan(plan, { dryRun: true })
    expect(summary).toMatchObject({ sessionsCreated: 1, bandsCreated: 1, recordsCreated: 1 })
    expect(await getSessions()).toHaveLength(0)
    expect(await getBands()).toHaveLength(0)
    expect(await getAllRecords()).toHaveLength(0)
  })
})

describe('applyImportPlan — bander linking', () => {
  it('links known banders, sets masterBander, and auto-creates unknown helpers', async () => {
    await savePerson({ id: 'p-hd', name: 'Hallie Daly', initials: 'HD', active: true, createdAt: now, updatedAt: now })
    await saveBander({ id: 'b-hd', personId: 'p-hd', role: 'Master Bander', createdAt: now, updatedAt: now })

    const plan = buildImportPlan(sheet([
      cap({ Bander: 'HD', 'Band Number': '142263301' }),
      cap({ Bander: 'AF', 'Band Number': '142263302' }), // unknown helper
    ]))
    const summary = await applyImportPlan(plan)

    expect(summary.banderLogsCreated).toBe(2)        // HD linked + AF auto-created & linked
    expect(summary.peopleCreated).toEqual(['AF'])

    const sess = await getSessions()
    expect(sess[0]!.masterBanderId).toBe('b-hd')
    const logs = await getAllSessionBanderLogs()
    expect(logs).toHaveLength(2)

    // AF now exists as a Person (placeholder name = initials) with a Bander record
    const people = await getPeople()
    const af = people.find(p => p.initials === 'AF')
    expect(af).toMatchObject({ initials: 'AF', name: 'AF', active: true })
  })

  it('aliases JV → JVD to link an existing person instead of creating a duplicate', async () => {
    await savePerson({ id: 'p-jvd', name: 'Joanna van Dyk', initials: 'JVD', active: true, createdAt: now, updatedAt: now })
    await saveBander({ id: 'b-jvd', personId: 'p-jvd', role: 'Sub-permittee', createdAt: now, updatedAt: now })

    const summary = await applyImportPlan(buildImportPlan(sheet([cap({ Bander: 'JV' })])))

    expect(summary.peopleCreated).toEqual([])         // no new person — aliased to JVD
    expect(summary.banderLogsCreated).toBe(1)
    const logs = await getAllSessionBanderLogs()
    expect(logs[0]!.banderId).toBe('b-jvd')
    expect((await getPeople())).toHaveLength(1)
  })
})
