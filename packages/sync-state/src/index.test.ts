import { describe, expect, it } from 'vitest'
import { createEvent } from '@birdnerd/events'
import { EventLog } from './index.js'

describe('EventLog', () => {
  it('appends through admission and deduplicates retrying the same immutable event', () => {
    const event = createEvent({
      event_type: 'workspace.created',
      workspace_id: '018f8c7b-0000-7000-8000-000000000001',
      command_id: '018f8c7b-0000-7000-8000-000000000002',
      actor: { kind: 'restricted-provisioner', provisioner_id: 'local-admin' },
      payload: { workspace_id: '018f8c7b-0000-7000-8000-000000000001', name: 'Cedar Creek' },
    })
    const log = new EventLog([], () => ({ accepted: true }))

    expect(log.append(event).kind).toBe('accepted')
    expect(log.append(event).kind).toBe('duplicate')
    expect(log.snapshot()).toEqual([event])
  })

  it('admits every initial hand-off event before making it available', () => {
    const event = createEvent({
      event_type: 'workspace.created',
      workspace_id: '018f8c7b-0000-7000-8000-000000000001',
      command_id: '018f8c7b-0000-7000-8000-000000000002',
      actor: { kind: 'restricted-provisioner', provisioner_id: 'local-admin' },
      payload: { workspace_id: '018f8c7b-0000-7000-8000-000000000001', name: 'Cedar Creek' },
    })

    expect(() => new EventLog([event], () => ({ accepted: false, reason: 'Not admitted.' }))).toThrow('Initial Event Log entry was rejected')
  })
})
