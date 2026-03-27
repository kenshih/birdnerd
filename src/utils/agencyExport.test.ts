import { describe, it, expect } from 'vitest'
import { generateIBPRows, generateBBLRows, generateBBLRecapRows } from './agencyExport'
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

describe('BBL Upload — generateBBLRows', () => {
  it('generates correct headers (58 columns)', () => {
    const { headers } = generateBBLRows([], ctx)
    expect(headers.length).toBe(58)
    expect(headers[0]).toBe('Band Number')
    expect(headers[2]).toBe('Disposition')
    expect(headers[17]).toBe('How Captured')
  })

  it('only includes new bandings (bbpCode 1)', () => {
    const newRec: BirdRecord = {
      id: 'r10', sessionId: 'sess-1', bbpCode: '1',
      bandNumber: '1422-63301', speciesCode: 'SOSP',
      createdAt: '', updatedAt: '',
    }
    const recapRec: BirdRecord = {
      id: 'r11', sessionId: 'sess-1', bbpCode: 'R',
      bandNumber: '1422-63302', speciesCode: 'WIWA',
      createdAt: '', updatedAt: '',
    }
    const unbanded: BirdRecord = {
      id: 'r12', sessionId: 'sess-1', bbpCode: 'U',
      createdAt: '', updatedAt: '',
    }
    const { rows } = generateBBLRows([newRec, recapRec, unbanded], ctx)
    expect(rows.length).toBe(1)
    expect(rows[0][1]).toBe('SOSP')
  })

  it('maps a new banding record to BBL row', () => {
    const rec: BirdRecord = {
      id: 'r13', sessionId: 'sess-1',
      bandId: 'band-1', bandNumber: '1422-63301',
      speciesCode: 'CALT', bbpCode: '1',
      age: '5', howAged: 'CL', sex: 'M', howSexed: 'CL',
      status: '300', skull: '6', cp: '1', bp: '0', fat: '1',
      bodyMolt: '3', ffMolt: 'A', wrp: 'DCB',
      wing: 88, bodyMass: 49.3,
      date: '2026-04-19', captureTime: '07:10',
      bander: 'bdr-1', featherPull: true, bloodSample: false,
      notes: 'test note',
      createdAt: '', updatedAt: '',
    }
    const { rows } = generateBBLRows([rec], ctx)
    expect(rows.length).toBe(1)
    const row = rows[0]

    expect(row[0]).toBe('142263301')       // Band Number (no hyphen)
    expect(row[1]).toBe('CALT')            // Species
    expect(row[2]).toBe('1')               // Disposition (bbpCode)
    expect(row[3]).toBe('2026')            // Banding Year
    expect(row[4]).toBe('4')               // Banding Month (no leading zero)
    expect(row[5]).toBe('19')              // Banding Day
    expect(row[6]).toBe('5')               // Age (numeric)
    expect(row[7]).toBe('CL')             // How Aged (BBL 2-letter, no conversion)
    expect(row[8]).toBe('M')               // Sex
    expect(row[9]).toBe('CL')             // How Sexed (BBL 2-letter)
    expect(row[10]).toBe('300')            // Bird Status
    expect(row[11]).toBe('GCBS')           // Location (from session FK)
    expect(row[12]).toBe('test note')      // Remarks
    expect(row[15]).toBe('TS')             // Bander ID (initials)
    expect(row[17]).toBe('Mist net')       // How Captured (hardcoded)
    expect(row[18]).toBe('710')            // Capture Time numeric
    expect(row[19]).toBe('07:10')          // Capture Time HH:MM
    expect(row[20]).toBe('R')              // Banded Leg (hardcoded)
    expect(row[21]).toBe('88')             // Wing Chord
    expect(row[28]).toBe('49.3')           // Bird Weight
    expect(row[32]).toBe('1')              // Fat Score
    expect(row[33]).toBe('6')              // Skull
    expect(row[34]).toBe('0')              // Brood Patch
    expect(row[35]).toBe('1')              // Cloacal Protuberance
    expect(row[36]).toBe('Y')              // Body Molt (BBL Y/N, 3→Y)
    expect(row[37]).toBe('Y')              // FF Molt (BBL Y/N, A→Y)
    expect(row[38]).toBe('DCB')            // Molt Cycle Code (WRP)
    expect(row[44]).toBe('N')              // Blood sample
    expect(row[45]).toBe('Y')              // Feather sample
  })
})

describe('BBL Recapture Upload — generateBBLRecapRows', () => {
  it('generates correct headers (60 columns)', () => {
    const { headers } = generateBBLRecapRows([], ctx)
    expect(headers.length).toBe(60)
    expect(headers[0]).toBe('Band Number')
    expect(headers[11]).toBe('How Obtained')
    expect(headers[12]).toBe('Present Condition')
  })

  it('only includes recaptures (bbpCode R, F, 4, etc.)', () => {
    const newRec: BirdRecord = {
      id: 'r20', sessionId: 'sess-1', bbpCode: '1',
      createdAt: '', updatedAt: '',
    }
    const recapR: BirdRecord = {
      id: 'r21', sessionId: 'sess-1', bbpCode: 'R',
      bandNumber: '1422-63301', speciesCode: 'WIWA',
      presentCondition: 'H',
      createdAt: '', updatedAt: '',
    }
    const recapF: BirdRecord = {
      id: 'r22', sessionId: 'sess-1', bbpCode: 'F',
      bandNumber: '9999-00001', speciesCode: 'SOSP',
      createdAt: '', updatedAt: '',
    }
    const recap4: BirdRecord = {
      id: 'r23', sessionId: 'sess-1', bbpCode: '4',
      bandNumber: '1422-63302',
      replacedBandNumber: '1422-63300',
      createdAt: '', updatedAt: '',
    }
    const { rows } = generateBBLRecapRows([newRec, recapR, recapF, recap4], ctx)
    expect(rows.length).toBe(3)
    // R recapture
    expect(rows[0][0]).toBe('142263301')
    expect(rows[0][12]).toBe('H')            // Present Condition
    expect(rows[0][11]).toBe('Mist net')     // How Obtained
    // F foreign recapture
    expect(rows[1][1]).toBe('SOSP')
    // 4 band changed — Second Band Number populated
    expect(rows[2][15]).toBe('142263300')     // Second Band Number (replaced)
  })
})
