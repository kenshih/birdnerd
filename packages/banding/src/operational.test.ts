import { describe, expect, it } from 'vitest'
import { createEvent } from '@birdnerd/events'
import { decideOperationalCommand, projectOperationalEvents } from './operational.js'

const workspace_id = '018f8c7b-0000-7000-8000-000000000001'
const actor = '018f8c7b-0000-7000-8000-000000000002'
const station_id = '018f8c7b-0000-7000-8000-000000000003'
const context = { workspace_id, user_account_id: actor, role: 'admin' as const, command_id: '018f8c7b-0000-7000-8000-000000000004', hlc: { physical_ms: 1000, logical: 0 } }
const eventContext = { workspace_id, actor: { kind: 'user-account' as const, user_account_id: actor }, command_id: context.command_id, hlc: context.hlc }

describe('operational Module', () => {
  it('gives immediate role feedback and creates immutable configuration facts', () => {
    const empty = projectOperationalEvents([])
    expect(() => decideOperationalCommand(empty, { ...context, role: 'contributor' }, { kind: 'create', entity_kind: 'station', entity_id: station_id, fields: { name: 'North' } })).toThrow('Admin')
    const decision = decideOperationalCommand(empty, context, { kind: 'create', entity_kind: 'station', entity_id: station_id, fields: { name: 'North' } })
    expect(decision.events[0]).toMatchObject({ event_type: 'station.created', payload: { station_id, fields: { name: 'North' } } })
  })

  it('emits required structural references instead of hiding them inside fields', () => {
    const decision = decideOperationalCommand(projectOperationalEvents([]), context, {
      kind: 'create', entity_kind: 'net', entity_id: '018f8c7b-0000-7000-8000-000000000009', station_id, fields: { label: 'N1' },
    })
    expect(decision.events[0]).toMatchObject({ event_type: 'net.created', payload: { station_id, fields: { label: 'N1' } } })
  })

  it('replays fields by HLC/event ID without letting an amendment reactivate an entity', () => {
    const created = createEvent({ ...eventContext, event_id: '018f8c7b-0000-7000-8000-000000000010', event_type: 'station.created', payload: { station_id, fields: { name: 'North' } } })
    const deactivated = createEvent({ ...eventContext, event_id: '018f8c7b-0000-7000-8000-000000000011', hlc: { physical_ms: 1002, logical: 0 }, event_type: 'station.deactivated', payload: { station_id } })
    const amended = createEvent({ ...eventContext, event_id: '018f8c7b-0000-7000-8000-000000000012', hlc: { physical_ms: 1003, logical: 0 }, event_type: 'station.fields-amended', payload: { station_id, fields: { name: 'South' } } })
    const projection = projectOperationalEvents([amended, created, deactivated])
    expect(projection.entities.get(station_id)).toMatchObject({ active: false, fields: { name: 'South' } })
  })

  it('retains an unresolved parent reference rather than guessing its kind', () => {
    const net = createEvent({ ...eventContext, event_id: '018f8c7b-0000-7000-8000-000000000020', event_type: 'net.created', payload: { net_id: '018f8c7b-0000-7000-8000-000000000021', station_id } })
    expect(projectOperationalEvents([net]).unresolved_references).toEqual([{ event_id: net.event_id, reference_id: station_id, expected_kind: 'station' }])
  })

  it('converges a child-first reference once its parent arrives and retains received band numbers', () => {
    const net = createEvent({ ...eventContext, event_id: '018f8c7b-0000-7000-8000-000000000020', event_type: 'net.created', payload: { net_id: '018f8c7b-0000-7000-8000-000000000021', station_id } })
    const station = createEvent({ ...eventContext, event_id: '018f8c7b-0000-7000-8000-000000000022', event_type: 'station.created', payload: { station_id } })
    const firstBand = createEvent({ ...eventContext, event_id: '018f8c7b-0000-7000-8000-000000000023', event_type: 'band.received', payload: { band_id: '018f8c7b-0000-7000-8000-000000000024', band_number: '1234-56789' } })
    const secondBand = createEvent({ ...eventContext, event_id: '018f8c7b-0000-7000-8000-000000000025', event_type: 'band.received', payload: { band_id: '018f8c7b-0000-7000-8000-000000000026', band_number: '123456789' } })
    const projection = projectOperationalEvents([net, firstBand, secondBand, station])
    expect(projection.unresolved_references).toEqual([])
    expect(projection.band_number_conflicts).toEqual([{ band_number: '123456789', band_ids: ['018f8c7b-0000-7000-8000-000000000024', '018f8c7b-0000-7000-8000-000000000026'] }])
  })

  it('allows Account-to-Person links only to an active projected Person', () => {
    const person_id = '018f8c7b-0000-7000-8000-000000000030'
    expect(() => decideOperationalCommand(projectOperationalEvents([]), context, { kind: 'link-user-account-person', user_account_id: actor, person_id })).toThrow('active Person')
    const person = createEvent({ ...eventContext, event_id: '018f8c7b-0000-7000-8000-000000000031', event_type: 'person.created', payload: { person_id, fields: { name: 'A Bander' } } })
    expect(decideOperationalCommand(projectOperationalEvents([person]), context, { kind: 'link-user-account-person', user_account_id: actor, person_id }).events[0]).toMatchObject({ event_type: 'user-account.person-linked', payload: { user_account_id: actor, person_id } })
  })
})
