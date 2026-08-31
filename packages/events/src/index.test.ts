import { describe, expect, it } from 'vitest'
import {
  assertEvent,
  canonicalizeEmail,
  compareEventOrder,
  createEvent,
  createUuidV7,
  decodeEventLog,
  encodeEventLog,
  observeHlc,
  parseRfc3339Milliseconds,
  sameEventContent,
  tickHlc,
  upcastEvent,
  type DomainEvent,
} from './index.js'

const workspaceId = '018f8c7b-0000-7000-8000-000000000001'

function workspaceCreatedEvent(): DomainEvent<'workspace.created'> {
  return createEvent({
    event_type: 'workspace.created',
    workspace_id: workspaceId,
    command_id: '018f8c7b-0000-7000-8000-000000000002',
    actor: { kind: 'restricted-provisioner', provisioner_id: 'local-admin' },
    payload: { workspace_id: workspaceId, name: 'Cedar Creek' },
  })
}

describe('@birdnerd/events', () => {
  it('creates RFC 9562-shaped UUIDv7 identifiers', () => {
    const id = createUuidV7(1_754_000_000_000, bytes => bytes.fill(0))
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('round-trips a canonical event log through decode and the v1 upcast boundary', () => {
    const event = workspaceCreatedEvent()

    expect(decodeEventLog(encodeEventLog([event]))).toEqual([event])
    expect(upcastEvent(event)).toEqual(event)
    expect(canonicalizeEmail('  Bander@Example.com ')).toBe('bander@example.com')
  })

  it('upcasts immutable v1 events with deterministic RFC 3339 milliseconds', () => {
    const current = workspaceCreatedEvent()
    const { event_envelope_version: _version, hlc: _hlc, ...legacy } = current
    const offset = { ...legacy, occurred_at: '2017-01-01T01:30:00.123456+01:30' }
    const leap = { ...legacy, occurred_at: '2016-12-31T23:59:60.250Z' }

    expect(upcastEvent(offset).hlc).toEqual({ physical_ms: 1_483_228_800_123, logical: 0 })
    expect(upcastEvent(leap).hlc).toEqual({ physical_ms: 1_483_228_800_250, logical: 0 })
    expect(parseRfc3339Milliseconds('2017-01-01T00:00:00.1Z')).toBe(1_483_228_800_100)
  })

  it('rejects a v1 envelope for Events introduced with the v2 pilot catalog', () => {
    const current = createEvent({
      event_type: 'session.created',
      workspace_id: workspaceId,
      command_id: '018f8c7b-0000-7000-8000-000000000002',
      actor: { kind: 'user-account', user_account_id: '018f8c7b-0000-7000-8000-000000000003' },
      payload: { session_id: '018f8c7b-0000-7000-8000-000000000004', fields: {} },
    })
    const { event_envelope_version: _version, hlc: _hlc, ...legacy } = current

    expect(() => upcastEvent(legacy)).toThrow('introduced with Event envelope version 2')
  })

  it('upcasts Phase 30 payloads to the explicit current v2 shapes', () => {
    const session = createEvent<'session.created'>({
      event_schema_version: 1,
      event_type: 'session.created', workspace_id: workspaceId, command_id: '018f8c7b-0000-7000-8000-000000000002',
      actor: { kind: 'user-account', user_account_id: '018f8c7b-0000-7000-8000-000000000003' },
      payload: { session_id: '018f8c7b-0000-7000-8000-000000000004', session_date: '2026-08-20', notes: 'Windy' },
    })
    const record = createEvent({
      event_schema_version: 1,
      event_type: 'banding-record.created', workspace_id: workspaceId, command_id: session.command_id,
      actor: session.actor,
      payload: { record_id: '018f8c7b-0000-7000-8000-000000000005', session_id: '018f8c7b-0000-7000-8000-000000000004', species_code: 'AMRO' },
    })
    expect(upcastEvent(session)).toMatchObject({ event_schema_version: 2, payload: { session_id: '018f8c7b-0000-7000-8000-000000000004', fields: { session_date: '2026-08-20', notes: 'Windy' } } })
    expect(upcastEvent(record)).toMatchObject({ event_schema_version: 2, payload: { record_id: '018f8c7b-0000-7000-8000-000000000005', session_id: '018f8c7b-0000-7000-8000-000000000004', fields: { species_code: 'AMRO' } } })
  })

  it('admits only the reviewed complete-form fields and explicit nullable clears', () => {
    const actor = { kind: 'user-account' as const, user_account_id: '018f8c7b-0000-7000-8000-000000000003' }
    const session = createEvent({
      event_type: 'session.created', workspace_id: workspaceId, command_id: '018f8c7b-0000-7000-8000-000000000002', actor,
      payload: { session_id: '018f8c7b-0000-7000-8000-000000000004', fields: { session_date: '2026-08-21', station_id: '018f8c7b-0000-7000-8000-000000000010', protocol: 'MAPS', maps_period: 3, open_time: '06:00', close_time: '12:00', master_bander_id: '018f8c7b-0000-7000-8000-000000000011', weather_open_temp: 10, weather_close_cloud: 75, notes: null } },
    })
    expect(() => assertEvent(session)).not.toThrow()
    const fields = { species_code: 'AMRO', wing: 102.4, feather_pull: false, net_id: '018f8c7b-0000-7000-8000-000000000012', bander_id: '018f8c7b-0000-7000-8000-000000000011', band_selection: { kind: 'managed' as const, band_id: '018f8c7b-0000-7000-8000-000000000013', band_number: '1234-56789' } }
    const record = createEvent<'banding-record.created'>({
      event_type: 'banding-record.created', workspace_id: workspaceId, command_id: session.command_id, actor,
      payload: { record_id: '018f8c7b-0000-7000-8000-000000000005', session_id: '018f8c7b-0000-7000-8000-000000000004', fields },
    })
    expect(() => assertEvent(record)).not.toThrow()
    const v2Payload = { record_id: '018f8c7b-0000-7000-8000-000000000005', session_id: '018f8c7b-0000-7000-8000-000000000004', fields }
    expect(() => assertEvent({ ...record, event_schema_version: 2, payload: { ...v2Payload, fields: { ...fields, unreviewed_field: 'nope' } } })).toThrow('not allowed by the Contract')
    expect(() => assertEvent({ ...record, event_schema_version: 2, payload: { ...v2Payload, fields: { ...fields, band_selection: { kind: 'managed', band_id: 'not-a-uuid', band_number: '1234-56789' } } } })).toThrow('must match exactly one')
  })

  it('accepts a canonical optional Station agency code and rejects malformed values', () => {
    const actor = { kind: 'user-account' as const, user_account_id: '018f8c7b-0000-7000-8000-000000000003' }
    const station = createEvent({
      event_type: 'station.created', workspace_id: workspaceId, command_id: '018f8c7b-0000-7000-8000-000000000002', actor,
      payload: { station_id: '018f8c7b-0000-7000-8000-000000000004', fields: { name: 'Galindo Creek', agency_code: 'GCFS' } },
    })

    expect(() => assertEvent(station)).not.toThrow()
    expect(() => assertEvent({ ...station, payload: { ...station.payload, fields: { agency_code: 'gcfs' } } })).toThrow()
  })

  it('compares immutable Event content independently of object property order', () => {
    const event = workspaceCreatedEvent()
    const reordered = { ...event, payload: { name: event.payload.name, workspace_id: event.payload.workspace_id } }

    expect(sameEventContent(event, reordered)).toBe(true)
  })

  it('ticks, observes, rejects overflow, and resolves equal HLC values by Event ID', () => {
    expect(tickHlc({ physical_ms: 100, logical: 2 }, 99)).toEqual({ physical_ms: 100, logical: 3 })
    expect(tickHlc({ physical_ms: 100, logical: 2 }, 101)).toEqual({ physical_ms: 101, logical: 0 })
    expect(observeHlc({ physical_ms: 100, logical: 2 }, { physical_ms: 100, logical: 5 }, 90)).toEqual({ physical_ms: 100, logical: 6 })
    expect(observeHlc({ physical_ms: 100, logical: 2 }, { physical_ms: 110, logical: 3 }, 105)).toEqual({ physical_ms: 110, logical: 4 })
    expect(() => tickHlc({ physical_ms: 100, logical: Number.MAX_SAFE_INTEGER }, 99)).toThrow('overflow')
    expect(compareEventOrder(
      { hlc: { physical_ms: 100, logical: 1 }, event_id: '018f8c7b-0000-7000-8000-000000000001' },
      { hlc: { physical_ms: 100, logical: 1 }, event_id: '018f8c7b-0000-7000-8000-000000000002' },
    )).toBeLessThan(0)
  })

  it('rejects payload fields outside the YAML Event Contract', () => {
    const event = { ...workspaceCreatedEvent(), payload: { workspace_id: workspaceId, name: 'Cedar Creek', extra: true } }

    expect(() => assertEvent(event)).toThrow('not allowed by the Contract')
  })

  it('rejects noncanonical email and UUIDv7 values after structural validation', () => {
    expect(() => assertEvent({
      ...workspaceCreatedEvent(),
      event_type: 'membership.preauthorized',
      actor: { kind: 'restricted-provisioner', provisioner_id: 'local-admin' },
      payload: { membership_id: '018f8c7b-0000-7000-8000-000000000003', email: 'Bander@example.com', role: 'admin' },
    })).toThrow('canonicalized')

    expect(() => assertEvent({
      ...workspaceCreatedEvent(),
      event_id: '00000000-0000-4000-8000-000000000001',
    })).toThrow('Contract pattern')
  })

  it('requires a valid RFC 3339 date-time with an offset', () => {
    for (const occurred_at of ['2026-01-01', '2026-01-01T12:30:45', '2026-02-30T00:00:00Z', '2026-01-01T12:30:45+24:00']) {
      expect(() => assertEvent({ ...workspaceCreatedEvent(), occurred_at })).toThrow('RFC 3339 date-time')
    }

    expect(() => assertEvent({ ...workspaceCreatedEvent(), occurred_at: '2026-01-01T12:30:45.123+00:00' })).not.toThrow()
    expect(() => assertEvent({ ...workspaceCreatedEvent(), occurred_at: '2016-12-31T23:59:60Z' })).not.toThrow()
  })
})
