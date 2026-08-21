import { describe, expect, it } from 'vitest'
import { createEvent, type DomainEvent, type EventPayloadByType, type EventType } from '@birdnerd/events'
import { projectOperationalEvents } from './operational.js'

const workspace_id = '018f8c7b-0000-7000-8000-000000000001'
const actor = { kind: 'user-account' as const, user_account_id: '018f8c7b-0000-7000-8000-000000000002' }
const command_id = '018f8c7b-0000-7000-8000-000000000003'
const band_id = '018f8c7b-0000-7000-8000-000000000010'
const session_one_id = '018f8c7b-0000-7000-8000-000000000011'
const session_two_id = '018f8c7b-0000-7000-8000-000000000012'

function fact<T extends EventType>(event_id: string, physical_ms: number, event_type: T, payload: EventPayloadByType[T]): DomainEvent<T> {
  return createEvent<T>({ event_id, event_type, workspace_id, command_id, actor, hlc: { physical_ms, logical: 0 }, payload } as never)
}

const received = fact('018f8c7b-0000-7000-8000-000000000020', 1000, 'band.received', {
  band_id,
  band_number: '1154-81501',
  fields: { band_size: '1B', band_type: 'Standard' },
})
const sessionOne = fact('018f8c7b-0000-7000-8000-000000000021', 1001, 'session.created', {
  session_id: session_one_id,
  fields: { session_date: '2026-05-01' },
})
const sessionTwo = fact('018f8c7b-0000-7000-8000-000000000022', 1002, 'session.created', {
  session_id: session_two_id,
  fields: { session_date: '2026-06-10' },
})
const deployment = fact('018f8c7b-0000-7000-8000-000000000023', 1100, 'banding-record.created', {
  record_id: '018f8c7b-0000-7000-8000-000000000030',
  session_id: session_one_id,
  fields: { species_code: 'AMRO', capture_code: '1', band_selection: { kind: 'managed', band_id, band_number: '1154-81501' } },
})
const recapture = fact('018f8c7b-0000-7000-8000-000000000024', 1200, 'banding-record.created', {
  record_id: '018f8c7b-0000-7000-8000-000000000031',
  session_id: session_two_id,
  fields: { species_code: 'SOSP', capture_code: 'R', band_selection: { kind: 'managed', band_id, band_number: '1154-81501' } },
})

describe('derived Band inventory', () => {
  it('retains intrinsic metadata and derives deployment and encounter history in Event order', () => {
    const inventory = projectOperationalEvents([recapture, received, sessionTwo, deployment, sessionOne]).band_inventory.get(band_id)

    expect(inventory).toMatchObject({
      band_number: '1154-81501',
      band_size: '1B',
      band_type: 'Standard',
      status: 'deployed',
      current_species: 'SOSP',
      deployment_date: '2026-05-01',
      last_seen_date: '2026-06-10',
    })
    expect(inventory?.encounters.map(encounter => encounter.record_id)).toEqual([
      '018f8c7b-0000-7000-8000-000000000031',
      '018f8c7b-0000-7000-8000-000000000030',
    ])
  })

  it('recomputes a fate when its active Record is corrected or deactivated', () => {
    const lost = fact('018f8c7b-0000-7000-8000-000000000025', 1300, 'banding-record.created', {
      record_id: '018f8c7b-0000-7000-8000-000000000032',
      session_id: session_two_id,
      fields: { capture_code: 'L', band_selection: { kind: 'managed', band_id, band_number: '1154-81501' } },
    })
    const deactivated = fact('018f8c7b-0000-7000-8000-000000000026', 1400, 'banding-record.deactivated', { record_id: '018f8c7b-0000-7000-8000-000000000032' })
    const reactivated = fact('018f8c7b-0000-7000-8000-000000000027', 1500, 'banding-record.reactivated', { record_id: '018f8c7b-0000-7000-8000-000000000032' })
    const corrected = fact('018f8c7b-0000-7000-8000-000000000028', 1600, 'banding-record.fields-amended', {
      record_id: '018f8c7b-0000-7000-8000-000000000032', fields: { capture_code: null },
    })
    const base = [received, sessionOne, sessionTwo, deployment, recapture]

    expect(projectOperationalEvents([lost, ...base]).band_inventory.get(band_id)?.status).toBe('lost')
    expect(projectOperationalEvents([deactivated, lost, ...base]).band_inventory.get(band_id)?.status).toBe('deployed')
    expect(projectOperationalEvents([reactivated, deactivated, lost, ...base]).band_inventory.get(band_id)?.status).toBe('lost')
    expect(projectOperationalEvents([corrected, reactivated, deactivated, lost, ...base]).band_inventory.get(band_id)?.status).toBe('deployed')
  })

  it('derives replacement for the old-number snapshot while keeping the selected new Band deployed', () => {
    const oldBandId = '018f8c7b-0000-7000-8000-000000000040'
    const newBandId = '018f8c7b-0000-7000-8000-000000000041'
    const oldBand = fact('018f8c7b-0000-7000-8000-000000000042', 1000, 'band.received', { band_id: oldBandId, band_number: '1154-70001' })
    const newBand = fact('018f8c7b-0000-7000-8000-000000000043', 1001, 'band.received', { band_id: newBandId, band_number: '1154-80001' })
    const changed = fact('018f8c7b-0000-7000-8000-000000000044', 1100, 'banding-record.created', {
      record_id: '018f8c7b-0000-7000-8000-000000000045',
      session_id: session_one_id,
      fields: { capture_code: 'R', replaced_band_number: '115470001', band_selection: { kind: 'managed', band_id: newBandId, band_number: '1154-80001' } },
    })
    const inventory = projectOperationalEvents([changed, newBand, sessionOne, oldBand]).band_inventory

    expect(inventory.get(oldBandId)).toMatchObject({ status: 'replaced', encounters: [{ relationship: 'replaced' }] })
    expect(inventory.get(newBandId)).toMatchObject({ status: 'deployed', encounters: [{ relationship: 'selected' }] })
  })

  it('uses lifecycle for inactive state and supports explicit metadata clears', () => {
    const amendment = fact('018f8c7b-0000-7000-8000-000000000050', 1700, 'band.fields-amended', {
      band_id, fields: { band_size: null, band_type: 'Lock-on' },
    })
    const deactivated = fact('018f8c7b-0000-7000-8000-000000000051', 1800, 'band.deactivated', { band_id })
    const projection = projectOperationalEvents([deactivated, amendment, deployment, sessionOne, received])

    expect(projection.entities.get(band_id)?.fields).toMatchObject({ band_size: null, band_type: 'Lock-on' })
    expect(projection.band_inventory.get(band_id)).toMatchObject({ active: false, status: 'inactive', band_type: 'Lock-on' })
    expect(projection.band_inventory.get(band_id)?.band_size).toBeUndefined()
  })

  it('chooses competing status facts by HLC and Event ID, not replay order', () => {
    const destroyed = fact('018f8c7b-0000-7000-8000-000000000061', 2000, 'banding-record.created', {
      record_id: '018f8c7b-0000-7000-8000-000000000062', session_id: session_two_id,
      fields: { capture_code: 'D', band_selection: { kind: 'managed', band_id, band_number: '1154-81501' } },
    })
    const speciesCorrection = fact('018f8c7b-0000-7000-8000-000000000063', 3000, 'banding-record.fields-amended', {
      record_id: '018f8c7b-0000-7000-8000-000000000030', fields: { species_code: 'WEKI' },
    })

    expect(projectOperationalEvents([destroyed, recapture, received, sessionTwo]).band_inventory.get(band_id)?.status).toBe('destroyed')
    expect(projectOperationalEvents([received, sessionTwo, destroyed, recapture]).band_inventory.get(band_id)?.status).toBe('destroyed')
    expect(projectOperationalEvents([speciesCorrection, destroyed, deployment, received, sessionOne, sessionTwo]).band_inventory.get(band_id)).toMatchObject({ status: 'destroyed', current_species: 'WEKI' })
  })
})
