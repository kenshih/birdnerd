import { describe, it, expect } from 'vitest'
import { generateIBPRows } from './agencyExport'
import type { BirdRecord, Session, Location, Band, Person, Bander } from '../types'

const session: Session = {
  id: 'sess-1', locationId: 'loc-1', date: '2026-04-19',
  createdAt: '', updatedAt: '',
}
const location: Location = {
  id: 'loc-1', banderLocationId: 'GCBS', bblLocationId: null,
  name: 'Galindo Creek', latitude: 37.9, longitude: -122.1,
  country: 'US', stateProvince: 'CA', remarks: '',
  createdAt: '', updatedAt: '',
}
const band: Band = {
  id: 'band-1', bandNumber: '1422-63301', status: 'deployed',
  bandSize: '2', bandType: 'Standard',
  createdAt: '', updatedAt: '',
}
const person: Person = {
  id: 'pers-1', name: 'Tatyana Soto-Bartzi', initials: 'TS',
  active: true, createdAt: '', updatedAt: '',
}
const bander: Bander = {
  id: 'bdr-1', personId: 'pers-1', role: 'Sub-permittee',
  createdAt: '', updatedAt: '',
}

const ctx = {
  sessions: [session],
  locations: [location],
  bands: [band],
  people: [person],
  banders: [bander],
}

describe('IBP Export — generateIBPRows', () => {
  it('generates correct headers (49 columns)', () => {
    const { headers } = generateIBPRows([], ctx)
    expect(headers.length).toBe(49)
    expect(headers[0]).toBe('Bander')
    expect(headers[1]).toBe('Code IBP')
    expect(headers[4]).toBe('Band Number')
    expect(headers[6]).toBe('ALPHA Code')
  })

  it('maps a full new banding record to IBP row', () => {
    const rec: BirdRecord = {
      id: 'r1', sessionId: 'sess-1',
      bandId: 'band-1', bandNumber: '1422-63301',
      speciesCode: 'CALT', age: '5', sex: 'M',
      howAged: 'CL', howAged2: 'PL', howSexed: 'CL',
      bbpCode: '1', wrp: 'DCB',
      skull: '6', cp: '1', bp: '0', fat: '1',
      bodyMolt: '0', ffMolt: 'N', ffWear: '3', juvBodyPlumage: '0',
      moltLimitsPCovs: 'B', moltLimitsSCovs: 'B',
      moltLimitsPP: 'B', moltLimitsSS: 'B',
      moltLimitsTert: 'B', moltLimitsRec: 'B',
      moltLimitsBodyPlum: 'B', moltLimitsNonFeather: 'B',
      wing: 88, bodyMass: 49.3,
      status: '300',
      date: '2026-04-19', captureTime: '07:10',
      station: 'GCBS', net: 'T4', bander: 'bdr-1',
      featherPull: false, bloodSample: false, notes: '',
      createdAt: '', updatedAt: '',
    }

    const { rows } = generateIBPRows([rec], ctx)
    expect(rows.length).toBe(1)
    const row = rows[0]

    // Bander
    expect(row[0]).toBe('TS')
    // Code IBP (1 → N)
    expect(row[1]).toBe('N')
    // Code BBL
    expect(row[2]).toBe('1')
    // Band Size
    expect(row[3]).toBe('2')
    // Band Number (no hyphen)
    expect(row[4]).toBe('142263301')
    // ALPHA Code
    expect(row[6]).toBe('CALT')
    // Age NUMBER
    expect(row[7]).toBe('5')
    // Age alpha
    expect(row[8]).toBe('SY')
    // How Aged IBP (CL → C)
    expect(row[9]).toBe('C')
    // How Aged BBL
    expect(row[10]).toBe('CL')
    // How Aged IBP 2 (PL → P)
    expect(row[11]).toBe('P')
    // WRP
    expect(row[12]).toBe('DCB')
    // Sex
    expect(row[13]).toBe('M')
    // How Sexed IBP (CL → C)
    expect(row[14]).toBe('C')
    // How Sexed BBL
    expect(row[15]).toBe('CL')
    // Body Molt IBP
    expect(row[21]).toBe('0')
    // Body Molt BBL
    expect(row[22]).toBe('N')
    // FF Molt IBP
    expect(row[23]).toBe('N')
    // FF Molt BBL
    expect(row[24]).toBe('N')
    // Wing
    expect(row[35]).toBe('88')
    // Body Mass
    expect(row[36]).toBe('49.3')
    // Status
    expect(row[37]).toBe('300')
    // Month (no leading zero)
    expect(row[38]).toBe('4')
    // Day
    expect(row[39]).toBe('19')
    // Year
    expect(row[40]).toBe('2026')
    // Capture Time (numeric)
    expect(row[41]).toBe('710')
    // Station
    expect(row[42]).toBe('GCBS')
    // Net
    expect(row[43]).toBe('T4')
    // Disposition
    expect(row[44]).toBe('')
    // Note
    expect(row[45]).toBe('')
    // Feather Pull
    expect(row[46]).toBe('N')
    // Feather Pull BBL
    expect(row[47]).toBe('N')
    // Blood Sample BBL
    expect(row[48]).toBe('N')
  })

  it('handles empty/missing fields gracefully', () => {
    const rec: BirdRecord = {
      id: 'r2', sessionId: 'sess-1',
      bbpCode: 'U', bandNumber: 'UNBANDED',
      createdAt: '', updatedAt: '',
    }
    const { rows } = generateIBPRows([rec], ctx)
    expect(rows.length).toBe(1)
    const row = rows[0]
    // Band number should be empty for UNBANDED
    expect(row[4]).toBe('')
    // Code IBP
    expect(row[1]).toBe('U')
    // Missing fields should be empty strings
    expect(row[6]).toBe('') // ALPHA Code
    expect(row[35]).toBe('') // Wing
  })

  it('resolves location from session FK', () => {
    const rec: BirdRecord = {
      id: 'r3', sessionId: 'sess-1',
      bbpCode: '1',
      createdAt: '', updatedAt: '',
    }
    const { rows } = generateIBPRows([rec], ctx)
    // Station should resolve from session → location
    expect(rows[0][42]).toBe('GCBS')
  })

  it('handles body molt Y for values 1-4', () => {
    const rec: BirdRecord = {
      id: 'r4', sessionId: 'sess-1',
      bodyMolt: '3', ffMolt: 'A',
      createdAt: '', updatedAt: '',
    }
    const { rows } = generateIBPRows([rec], ctx)
    expect(rows[0][21]).toBe('3')   // Body Molt IBP
    expect(rows[0][22]).toBe('Y')   // Body Molt BBL
    expect(rows[0][23]).toBe('A')   // FF Molt IBP
    expect(rows[0][24]).toBe('Y')   // FF Molt BBL
  })

  it('maps featherPull/bloodSample booleans to Y/N', () => {
    const rec: BirdRecord = {
      id: 'r5', sessionId: 'sess-1',
      featherPull: true, bloodSample: true,
      createdAt: '', updatedAt: '',
    }
    const { rows } = generateIBPRows([rec], ctx)
    expect(rows[0][46]).toBe('Y')  // Feather Pull
    expect(rows[0][47]).toBe('Y')  // Feather Pull BBL
    expect(rows[0][48]).toBe('Y')  // Blood Sample BBL
  })
})
