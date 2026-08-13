import { describe, expect, it, vi } from 'vitest'
import { createEvent } from '@birdnerd/events'
import { createSyncCoordinator, EventLog, InMemoryEventExchange, type DurableReplica, type SyncCommit } from './index.js'

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

describe('SyncCoordinator', () => {
  it('pushes pending Events, consumes server-sequenced pages, and commits each cursor durably', async () => {
    const local = makeEvent('018f8c7b-0000-7000-8000-000000000010')
    const remote = makeEvent('018f8c7b-0000-7000-8000-000000000011')
    const exchange = new InMemoryEventExchange([remote])
    const commits: SyncCommit[] = []
    const replica: DurableReplica = {
      async readSyncInput() { return { workspace_id: local.workspace_id, cursor: 0, pending_events: [local], has_more_pending: false, failure_count: 0 } },
      async commit(result) { commits.push(result) },
      async recordFailure() { throw new Error('unexpected') },
    }
    const coordinator = createSyncCoordinator(replica, exchange, { batch_size: 1, now: () => 5000 })

    await expect(coordinator.synchronize()).resolves.toEqual({ kind: 'idle', last_synced_at: 5000 })
    expect(commits.map(commit => commit.cursor)).toEqual([1, 2, 2])
    expect(commits[0].receipts[0]).toMatchObject({ kind: 'accepted', event_id: local.event_id })
    expect(commits.flatMap(commit => commit.pulled).map(item => item.event.event_id)).toEqual([remote.event_id, local.event_id])
  })

  it('retains work and records exponential retry after exchange failure', async () => {
    const failures: Array<{ message: string; retryAt: number }> = []
    const replica: DurableReplica = {
      async readSyncInput() { return { workspace_id: makeEvent().workspace_id, cursor: 0, pending_events: [makeEvent()], has_more_pending: false, failure_count: 0 } },
      async commit() {},
      async recordFailure(message, retryAt) { failures.push({ message, retryAt }) },
    }
    const exchange = new InMemoryEventExchange()
    exchange.push = async () => { throw new Error('network down') }
    const coordinator = createSyncCoordinator(replica, exchange, { now: () => 10_000, retry_base_ms: 500, schedule: () => {} })

    expect(await coordinator.synchronize()).toEqual({ kind: 'offline', message: 'network down', retry_at: 10_500 })
    expect(await coordinator.synchronize()).toEqual({ kind: 'offline', message: 'network down', retry_at: 11_000 })
    expect(failures).toHaveLength(2)
  })

  it('honors a durable retry deadline after coordinator restart', async () => {
    const event = makeEvent()
    const scheduled: number[] = []
    const replica: DurableReplica = {
      async readSyncInput() {
        return {
          workspace_id: event.workspace_id,
          cursor: 0,
          pending_events: [event],
          has_more_pending: false,
          failure_count: 3,
          retry_at: 11_000,
          last_failure: 'still offline',
        }
      },
      async commit() { throw new Error('unexpected') },
      async recordFailure() { throw new Error('unexpected') },
    }
    const exchange = new InMemoryEventExchange()
    exchange.push = vi.fn(async () => [])
    const coordinator = createSyncCoordinator(replica, exchange, { now: () => 10_000, schedule: (_run, delay) => scheduled.push(delay) })

    await expect(coordinator.synchronize()).resolves.toEqual({ kind: 'offline', message: 'still offline', retry_at: 11_000 })
    expect(exchange.push).not.toHaveBeenCalled()
    expect(scheduled).toEqual([1_000])
  })

  it('schedules the next pending batch after a successful bounded push', async () => {
    const event = makeEvent()
    const scheduled: number[] = []
    const replica: DurableReplica = {
      async readSyncInput() { return { workspace_id: event.workspace_id, cursor: 0, pending_events: [event], has_more_pending: true, failure_count: 0 } },
      async commit() {},
      async recordFailure() { throw new Error('unexpected') },
    }
    const coordinator = createSyncCoordinator(replica, new InMemoryEventExchange(), {
      now: () => 10_000,
      schedule: (_run, delay) => scheduled.push(delay),
    })

    await expect(coordinator.synchronize()).resolves.toEqual({ kind: 'idle', last_synced_at: 10_000 })
    expect(scheduled).toEqual([0])
  })
})

function makeEvent(eventId = '018f8c7b-0000-7000-8000-000000000010') {
  return createEvent({
    event_id: eventId,
    event_type: 'workspace.created',
    workspace_id: '018f8c7b-0000-7000-8000-000000000001',
    command_id: '018f8c7b-0000-7000-8000-000000000002',
    actor: { kind: 'restricted-provisioner', provisioner_id: 'local-admin' },
    payload: { workspace_id: '018f8c7b-0000-7000-8000-000000000001', name: 'Cedar Creek' },
  })
}
