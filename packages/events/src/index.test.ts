import { describe, expect, it } from 'vitest'
import { assertDraftEvent, canonicalizeEmail, createDraftEvent, createUuidV7, decodeDraftEventLog, encodeDraftEventLog } from './index.js'

describe('@birdnerd/events Phase 28 draft contracts', () => {
  it('creates RFC 9562-shaped UUIDv7 identifiers', () => {
    const id = createUuidV7(1_754_000_000_000, bytes => bytes.fill(0))
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('round-trips a canonical workspace-created event', () => {
    const event = createDraftEvent({
      event_type: 'workspace.created',
      workspace_id: '018f8c7b-0000-7000-8000-000000000001',
      command_id: '018f8c7b-0000-7000-8000-000000000002',
      actor: { kind: 'restricted-provisioner', provisioner_id: 'local-admin' },
      payload: { workspace_id: '018f8c7b-0000-7000-8000-000000000001', name: 'Cedar Creek' },
    })

    expect(decodeDraftEventLog(encodeDraftEventLog([event]))).toEqual([event])
    expect(canonicalizeEmail('  Bander@Example.com ')).toBe('bander@example.com')
  })

  it('rejects a pending Membership with a noncanonical email', () => {
    expect(() => assertDraftEvent({
      event_id: '018f8c7b-0000-7000-8000-000000000001',
      event_type: 'membership.preauthorized',
      event_schema_version: 1,
      workspace_id: '018f8c7b-0000-7000-8000-000000000002',
      command_id: '018f8c7b-0000-7000-8000-000000000003',
      occurred_at: new Date().toISOString(),
      actor: { kind: 'restricted-provisioner', provisioner_id: 'local-admin' },
      payload: { membership_id: '018f8c7b-0000-7000-8000-000000000004', email: 'Bander@example.com', role: 'admin' },
    })).toThrow('canonicalized')
  })
})
