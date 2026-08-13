import { describe, expect, it } from 'vitest'
import { assertEvent, canonicalizeEmail, createEvent, createUuidV7, decodeEventLog, encodeEventLog, upcastEvent } from './index.js'

const workspaceId = '018f8c7b-0000-7000-8000-000000000001'

function workspaceCreatedEvent() {
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

  it('rejects payload fields outside the YAML Event Contract', () => {
    const event = { ...workspaceCreatedEvent(), payload: { workspace_id: workspaceId, name: 'Cedar Creek', extra: true } }

    expect(() => assertEvent(event)).toThrow('not allowed by the Contract')
  })

  it('rejects noncanonical email and UUIDv7 values after structural validation', () => {
    expect(() => assertEvent({
      event_id: '018f8c7b-0000-7000-8000-000000000001',
      event_type: 'membership.preauthorized',
      event_schema_version: 1,
      workspace_id: workspaceId,
      command_id: '018f8c7b-0000-7000-8000-000000000002',
      occurred_at: new Date().toISOString(),
      actor: { kind: 'restricted-provisioner', provisioner_id: 'local-admin' },
      payload: { membership_id: '018f8c7b-0000-7000-8000-000000000003', email: 'Bander@example.com', role: 'admin' },
    })).toThrow('canonicalized')

    expect(() => assertEvent({
      ...workspaceCreatedEvent(),
      event_id: '00000000-0000-4000-8000-000000000001',
    })).toThrow('Contract pattern')
  })
})
