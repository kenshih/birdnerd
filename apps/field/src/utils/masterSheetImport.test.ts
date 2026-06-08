import { describe, it, expect } from 'vitest'
import {
  parseMasterSheet,
  buildImportPlan,
  rejectsToCsv,
  type ParsedSheet,
} from './masterSheetImport'

const HEADERS = [
  'Bander', 'Code IBP', 'Code BBL', 'Band Size', 'Band Number', 'Species Name', 'ALPHA Code',
  'Age NUMBER', 'Age', 'How Aged IBP', 'How Aged BBL', 'How Aged IBP 2', 'WRP',
  'Sex', 'How Sexed IBP', 'How Sexed BBL', 'How Sexed IBP 2',
  'Skull', 'Cloacal Protuberance', 'Brood Patch', 'Fat', 'Body Molt IBP', 'Body Molt BBL',
  'FF Molt IBP', 'FF Molt BBL', 'Flight Feather Wear', 'Juv. Body Plumage',
  'P covs', 'S covs', 'PP', 'SS', 'Tert', 'Rec', 'Body Plum', 'Non-Feath',
  'Wing', 'Body Mass', 'Status', 'Month', 'Day', 'Year', 'Capture Time',
  'Station', 'Net', 'Disposition', 'Note', 'Feather Pull', 'Feather Pull BBL', 'Blood Sample BBL', 'BBL submit?',
]

/** Build a ParsedSheet from row overrides (all other columns blank). */
function sheet(rows: Record<string, string>[]): ParsedSheet {
  return {
    headers: HEADERS,
    rows: rows.map(r => {
      const full: Record<string, string> = {}
      for (const h of HEADERS) full[h] = r[h] ?? ''
      return full
    }),
  }
}

const capture = (over: Record<string, string> = {}): Record<string, string> => ({
  Bander: 'TS', 'Code IBP': 'N', 'Code BBL': '1', 'Band Size': '1B', 'Band Number': '142263301',
  'Species Name': 'California Towhee', 'ALPHA Code': 'CALT', 'Age NUMBER': '5', Age: 'SY',
  'How Aged IBP': 'P', 'How Aged BBL': 'PL', WRP: 'DCB', Sex: 'M',
  'How Sexed IBP': 'C', 'How Sexed BBL': 'CL', Wing: '88', 'Body Mass': '49.3', Status: '300',
  Month: '4', Day: '19', Year: '2025', 'Capture Time': '710', Station: 'GCFS', Net: 'T4',
  'Blood Sample BBL': 'N', ...over,
})

describe('parseMasterSheet', () => {
  it('parses headers and rows, honoring quoted commas', () => {
    const csv = [
      'Bander,Note,Station',
      'HD,"caught, released",GCFS',
    ].join('\n')
    const parsed = parseMasterSheet(csv)
    expect(parsed.headers).toEqual(['Bander', 'Note', 'Station'])
    expect(parsed.rows[0]).toEqual({ Bander: 'HD', Note: 'caught, released', Station: 'GCFS' })
  })

  it('returns no rows for header-only input', () => {
    expect(parseMasterSheet('Bander,Station').rows).toEqual([])
  })
})

describe('buildImportPlan — captures', () => {
  it('derives a session, a deployed band, and a record from a capture row', () => {
    const plan = buildImportPlan(sheet([capture()]))
    expect(plan.sessions).toHaveLength(1)
    expect(plan.sessions[0]).toMatchObject({ key: 'GCFS|2025-04-19', stationCode: 'GCFS', date: '2025-04-19', banders: ['TS'] })
    expect(plan.bands).toHaveLength(1)
    expect(plan.bands[0]).toMatchObject({ bandNumber: '1422-63301', digits: '142263301', status: 'deployed', bandSize: '1B', currentSpecies: 'CALT', deploymentDate: '2025-04-19' })
    expect(plan.records).toHaveLength(1)
    expect(plan.rejects).toHaveLength(0)
  })

  it('maps fields correctly (date, time, codes, numbers)', () => {
    const { records } = buildImportPlan(sheet([capture()]))
    const f = records[0]!.fields
    expect(f).toMatchObject({
      date: '2025-04-19', captureTime: '07:10', station: 'GCFS', net: 'T4', bander: 'TS',
      speciesCode: 'CALT', age: '5', sex: 'M', wrp: 'DCB', bbpCode: '1',
      howAged: 'PL', howSexed: 'CL', wing: 88, bodyMass: 49.3, status: '300', bloodSample: false,
    })
  })

  it('maps BBL unknown age (0, or blank + alpha U) to our U code', () => {
    expect(buildImportPlan(sheet([capture({ 'Age NUMBER': '0', Age: 'U' })])).records[0]!.fields.age).toBe('U')
    expect(buildImportPlan(sheet([capture({ 'Age NUMBER': '', Age: 'U' })])).records[0]!.fields.age).toBe('U')
    expect(buildImportPlan(sheet([capture({ 'Age NUMBER': '', Age: '' })])).records[0]!.fields.age).toBeUndefined()
    expect(buildImportPlan(sheet([capture({ 'Age NUMBER': '6' })])).records[0]!.fields.age).toBe('6') // passes through
  })

  it('does not warn on in-table status, warns on out-of-table status', () => {
    const ok = buildImportPlan(sheet([capture({ Status: '318', 'Blood Sample BBL': 'Y' })]))
    expect(ok.warnings.some(w => w.field === 'Status')).toBe(false)
    expect(ok.records[0]!.fields.bloodSample).toBe(true)

    const bad = buildImportPlan(sheet([capture({ Status: '999' })]))
    expect(bad.warnings.some(w => w.field === 'Status' && w.message.includes('999'))).toBe(true)
  })
})

describe('buildImportPlan — band-event rows', () => {
  it('creates a band only (no record) for BAND DESTROYED', () => {
    const plan = buildImportPlan(sheet([{
      Bander: 'HD', 'Code IBP': 'D', 'Code BBL': '4', 'Band Size': '4', 'Band Number': '115481501',
      'Species Name': 'BAND DESTROYED', Month: '9', Day: '14', Year: '2025', Station: 'GCFS',
    }]))
    expect(plan.records).toHaveLength(0)
    expect(plan.bands).toHaveLength(1)
    expect(plan.bands[0]).toMatchObject({ status: 'destroyed', currentSpecies: undefined, deploymentDate: undefined })
    expect(plan.sessions).toHaveLength(1) // still forms a session
  })

  it('maps BAND LOST to lost', () => {
    const plan = buildImportPlan(sheet([{ 'Species Name': 'BAND LOST', 'Band Number': '999000111', Month: '1', Day: '2', Year: '2025', Station: 'GCFS' }]))
    expect(plan.bands[0]!.status).toBe('lost')
  })
})

describe('buildImportPlan — second aging/sexing criterion (IBP → BBL)', () => {
  it('maps a known IBP-2 letter to BBL', () => {
    const { records } = buildImportPlan(sheet([capture({ 'How Aged IBP 2': 'M', 'How Sexed IBP 2': 'E' })]))
    expect(records[0]!.fields.howAged2).toBe('MR')
    expect(records[0]!.fields.howSexed2).toBe('EY')
  })

  it('warns and drops an unmappable IBP-2 letter', () => {
    const { records, warnings } = buildImportPlan(sheet([capture({ 'How Aged IBP 2': 'Z' })]))
    expect(records[0]!.fields.howAged2).toBeUndefined()
    expect(warnings.some(w => w.field === 'How Aged IBP 2' && w.message.includes('Z'))).toBe(true)
  })
})

describe('buildImportPlan — data warts & rejects', () => {
  it('treats How Sexed BBL "FALSE" as blank + warns', () => {
    const { records, warnings } = buildImportPlan(sheet([capture({ 'How Sexed BBL': 'FALSE' })]))
    expect(records[0]!.fields.howSexed).toBeUndefined()
    expect(warnings.some(w => w.field === 'How Sexed BBL')).toBe(true)
  })

  it('rejects rows with an unparseable date', () => {
    const plan = buildImportPlan(sheet([capture({ Month: '', Day: '', Year: '' })]))
    expect(plan.records).toHaveLength(0)
    expect(plan.rejects).toHaveLength(1)
    expect(plan.rejects[0]!.problem).toMatch(/date/i)
  })

  it('rejects rows missing a station', () => {
    const plan = buildImportPlan(sheet([capture({ Station: '' })]))
    expect(plan.rejects[0]!.problem).toMatch(/station/i)
  })
})

describe('buildImportPlan — dedup within the sheet', () => {
  it('rolls multiple banders on a station-day into one session', () => {
    const plan = buildImportPlan(sheet([
      capture({ Bander: 'TS', 'Band Number': '142263301' }),
      capture({ Bander: 'JV', 'Band Number': '142263302' }),
    ]))
    expect(plan.sessions).toHaveLength(1)
    expect(plan.sessions[0]!.banders).toEqual(['TS', 'JV'])
  })

  it('emits one band draft for a repeated band number', () => {
    const plan = buildImportPlan(sheet([
      capture({ 'Band Number': '142263301' }),
      capture({ 'Band Number': '1422-63301' }), // same digits, different formatting
    ]))
    expect(plan.bands).toHaveLength(1)
  })
})

describe('rejectsToCsv', () => {
  it('appends a _problem column and escapes', () => {
    const csv = rejectsToCsv(['Bander', 'Note'], [
      { row: 1, problem: 'bad, date', raw: { Bander: 'HD', Note: 'x' } },
    ])
    const lines = csv.split('\n')
    expect(lines[0]).toBe('Bander,Note,_problem')
    expect(lines[1]).toBe('HD,x,"bad, date"')
  })
})
