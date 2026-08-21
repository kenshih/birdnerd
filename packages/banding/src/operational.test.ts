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
})
