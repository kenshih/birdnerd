import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { createEvent, type DomainEvent } from '@birdnerd/events'
import { projectOperationalEvents } from '@birdnerd/banding'
import { agencyCsvText, generateProjectionAgencyRows } from './agencyExport'

const workspaceId = '018f8c7b-0000-7000-8000-000000000001'
const userAccountId = '018f8c7b-0000-7000-8000-000000000002'
const ids = {
  station: '018f8c7b-0000-7000-8000-000000000010',
  session: '018f8c7b-0000-7000-8000-000000000011',
  person: '018f8c7b-0000-7000-8000-000000000012',
  bander: '018f8c7b-0000-7000-8000-000000000013',
  net: '018f8c7b-0000-7000-8000-000000000014',
  band: '018f8c7b-0000-7000-8000-000000000015',
  fateBand: '018f8c7b-0000-7000-8000-000000000016',
  newRecord: '018f8c7b-0000-7000-8000-000000000017',
  recapRecord: '018f8c7b-0000-7000-8000-000000000018',
  fateRecord: '018f8c7b-0000-7000-8000-000000000019',
  inactiveRecord: '018f8c7b-0000-7000-8000-000000000020',
} as const

let sequence = 100
function fact(event_type: DomainEvent['event_type'], payload: Record<string, unknown>): DomainEvent {
  sequence += 1
  return createEvent({
    event_id: `018f8c7b-0000-7000-8000-${sequence.toString(16).padStart(12, '0')}`,
    event_type,
    workspace_id: workspaceId,
    command_id: `018f8c7b-0000-7000-8000-${(sequence + 100).toString(16).padStart(12, '0')}`,
    occurred_at: '2026-04-19T12:00:00.000Z',
    hlc: { physical_ms: sequence, logical: 0 },
    actor: { kind: 'user-account', user_account_id: userAccountId },
    payload,
  } as never)
}

function projectionFixture(agencyCode = 'GCFS') {
  sequence = 100
  return projectOperationalEvents([
    fact('station.created', { station_id: ids.station, fields: { name: 'Galindo Creek', ...(agencyCode ? { agency_code: agencyCode } : {}) } }),
    fact('session.created', { session_id: ids.session, fields: { session_date: '2026-04-19', station_id: ids.station } }),
    fact('person.created', { person_id: ids.person, fields: { name: 'Tatyana Soto-Bartzi', initials: 'TS' } }),
    fact('bander.created', { bander_id: ids.bander, person_id: ids.person, fields: { role: 'Sub-permittee' } }),
    fact('net.created', { net_id: ids.net, station_id: ids.station, fields: { label: 'T4' } }),
    fact('band.received', { band_id: ids.band, band_number: '1422-63301', fields: { band_size: '2' } }),
    fact('band.received', { band_id: ids.fateBand, band_number: '1154-81501', fields: { band_size: '1B' } }),
    fact('banding-record.created', {
      record_id: ids.newRecord, session_id: ids.session,
      fields: {
        species_code: 'CALT', capture_code: '1', age: '5', how_aged: 'CL', how_aged_2: 'PL', sex: 'M', how_sexed: 'CL',
        skull: '6', cp: '1', bp: '0', fat: '1', body_molt: '0', ff_molt: 'N', ff_wear: '3', juv_body_plumage: '0',
        molt_limits_p_covs: 'B', molt_limits_s_covs: 'B', molt_limits_pp: 'B', molt_limits_ss: 'B', molt_limits_tert: 'B', molt_limits_rec: 'B', molt_limits_body_plum: 'B', molt_limits_non_feather: 'B',
        wing: 88, tail: 50, tarsus: 22.2, exposed_culmen: 10.5, body_mass: 49.3, status: '300', disposition: 'R', capture_time: '07:10', net_id: ids.net, bander_id: ids.bander,
        notes: 'caught, "released"\nnear creek', feather_pull: false, blood_sample: true,
        band_selection: { kind: 'managed', band_id: ids.band, band_number: '1422-63301' },
      },
    }),
    fact('banding-record.created', {
      record_id: ids.recapRecord, session_id: ids.session,
      fields: { species_code: 'WIWA', capture_code: 'R', age: '6', sex: 'F', present_condition: 'H', capture_time: '08:20', notes: 'foreign bird', bander_id: ids.bander, band_selection: { kind: 'foreign', band_number: '9999-00001' } },
    }),
    fact('banding-record.created', {
      record_id: ids.fateRecord, session_id: ids.session,
      fields: { capture_code: 'D', bander_id: ids.bander, band_selection: { kind: 'managed', band_id: ids.fateBand, band_number: '1154-81501' } },
    }),
    fact('banding-record.created', {
      record_id: ids.inactiveRecord, session_id: ids.session,
      fields: { species_code: 'DUST', capture_code: '1', band_selection: { kind: 'unbanded' } },
    }),
    fact('banding-record.deactivated', { record_id: ids.inactiveRecord }),
  ])
}

describe('Event-projection agency export', () => {
  it('matches the established agency CSV golden files from active projection facts', () => {
    const projection = projectionFixture()
    const ibp = agencyCsvText(generateProjectionAgencyRows(projection, 'ibp'))
    const bbl = agencyCsvText(generateProjectionAgencyRows(projection, 'bbl'))
    const recap = agencyCsvText(generateProjectionAgencyRows(projection, 'bbl-recap'))

    expect(ibp).toBe(golden('event-agency-export.ibp.csv'))
    expect(bbl).toBe(golden('event-agency-export.bbl.csv'))
    expect(recap).toBe(golden('event-agency-export.recap.csv'))
  })

  it('honors the selected Session scope and treats historical Stations without a code as blank', () => {
    const projection = projectionFixture('')

    expect(generateProjectionAgencyRows(projection, 'ibp', new Set()).rows).toEqual([])
    expect(generateProjectionAgencyRows(projection, 'bbl', new Set([ids.session])).rows[0]?.[11]).toBe('')
  })
})

function golden(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8').trimEnd()
}
