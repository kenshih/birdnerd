import { describe, expect, it, vi } from 'vitest'
import { createEvent, upcastEvent } from '@birdnerd/events'
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

  it('reports a persisted deferred admission dependency while automatic retry waits', async () => {
    const event = makeEvent()
    const scheduled: number[] = []
    const replica: DurableReplica = {
      async readSyncInput() {
        return {
          workspace_id: event.workspace_id,
          cursor: 0,
          pending_events: [event],
          has_more_pending: false,
          failure_count: 1,
          deferred_count: 1,
          retry_at: 11_000,
          last_failure: 'Session is not indexed yet.',
        }
      },
      async commit() { throw new Error('unexpected') },
      async recordFailure() { throw new Error('unexpected') },
    }
    const exchange = new InMemoryEventExchange()
    exchange.push = vi.fn(async () => [])
    const coordinator = createSyncCoordinator(replica, exchange, { now: () => 10_000, schedule: (_run, delay) => scheduled.push(delay) })

    await expect(coordinator.synchronize()).resolves.toEqual({
      kind: 'deferred', deferred: 1, message: 'Session is not indexed yet.', retry_at: 11_000,
    })
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

  it('commits mixed acceptance and permanent rejection receipts in one durable batch', async () => {
    const accepted = makeEvent('018f8c7b-0000-7000-8000-000000000010')
    const rejected = makeEvent('018f8c7b-0000-7000-8000-000000000011')
    const commits: SyncCommit[] = []
    const replica: DurableReplica = {
      async readSyncInput() {
        return { workspace_id: accepted.workspace_id, cursor: 0, pending_events: [accepted, rejected], has_more_pending: false, failure_count: 0 }
      },
      async commit(result) { commits.push(result) },
      async recordFailure() { throw new Error('unexpected') },
    }
    const exchange = new InMemoryEventExchange()
    const receipts = [
      { kind: 'accepted', event_id: accepted.event_id, server_sequence: 1 },
      { kind: 'rejected', event_id: rejected.event_id, reason: 'not admitted', permanent: true },
    ] as const
    exchange.push = async () => receipts
    const coordinator = createSyncCoordinator(replica, exchange, { now: () => 10_000 })

    await expect(coordinator.synchronize()).resolves.toEqual({ kind: 'attention', rejected: 1, last_synced_at: 10_000 })
    expect(commits).toEqual([{ receipts, pulled: [], cursor: 0 }])
  })

  it('keeps deferred admission dependencies visibly deferred and schedules bounded retry', async () => {
    const event = makeEvent()
    const commits: SyncCommit[] = []
    const scheduled: number[] = []
    const replica: DurableReplica = {
      async readSyncInput() { return { workspace_id: event.workspace_id, cursor: 0, pending_events: [event], has_more_pending: false, failure_count: 2 } },
      async commit(result) { commits.push(result) },
      async recordFailure() { throw new Error('unexpected') },
    }
    const exchange = new InMemoryEventExchange()
    exchange.push = async () => [{ kind: 'deferred', event_id: event.event_id, reason: 'Session is not indexed yet.', retryable: true }]
    await expect(createSyncCoordinator(replica, exchange, { now: () => 1_000, retry_base_ms: 500, schedule: (_run, delay) => scheduled.push(delay) }).synchronize())
      .resolves.toEqual({ kind: 'deferred', deferred: 1, message: 'Session is not indexed yet.', retry_at: 3_000 })
    expect(commits[0]).toMatchObject({ deferred_retry_at: 3_000 })
    expect(scheduled).toEqual([2_000])
  })

  it('forces a deferred Event retry when the user chooses Sync Now', async () => {
    const event = makeEvent()
    const exchange = new InMemoryEventExchange()
    exchange.push = vi.fn(async () => [{ kind: 'deferred' as const, event_id: event.event_id, reason: 'Session is not indexed yet.', retryable: true as const }])
    const replica: DurableReplica = {
      async readSyncInput() {
        return {
          workspace_id: event.workspace_id,
          cursor: 0,
          pending_events: [event],
          has_more_pending: false,
          failure_count: 1,
          deferred_count: 1,
          deferred_event_ids: [event.event_id],
          retry_at: 5_000,
          last_failure: 'Session is not indexed yet.',
        }
      },
      async commit() {},
      async recordFailure() { throw new Error('unexpected') },
    }
    const coordinator = createSyncCoordinator(replica, exchange, { now: () => 1_000, retry_base_ms: 500, schedule: () => {} })

    await expect(coordinator.synchronize({ force: true })).resolves.toEqual({ kind: 'deferred', deferred: 1, message: 'Session is not indexed yet.', retry_at: 2_000 })
    expect(exchange.push).toHaveBeenCalledWith([event])
  })

  it('replaces a force-retried deferred Event deadline with its new receipt deadline', async () => {
    const event = makeEvent()
    const commits: SyncCommit[] = []
    const replica: DurableReplica = {
      async readSyncInput() {
        return {
          workspace_id: event.workspace_id,
          cursor: 0,
          pending_events: [event],
          has_more_pending: false,
          failure_count: 0,
          deferred_count: 1,
          deferred_event_ids: [event.event_id],
          deferred_events: [{ event_id: event.event_id, retry_at: 1_500, reason: 'Session is not indexed yet.' }],
          retry_at: 1_500,
          last_failure: 'Session is not indexed yet.',
        }
      },
      async commit(result) { commits.push(result) },
      async recordFailure() { throw new Error('unexpected') },
    }
    const exchange = new InMemoryEventExchange()
    exchange.push = async () => [{ kind: 'deferred', event_id: event.event_id, reason: 'Session is not indexed yet.', retryable: true }]
    const coordinator = createSyncCoordinator(replica, exchange, { now: () => 1_000, retry_base_ms: 1_000, schedule: () => {} })

    await expect(coordinator.synchronize({ force: true })).resolves.toEqual({
      kind: 'deferred', deferred: 1, message: 'Session is not indexed yet.', retry_at: 2_000,
    })
    expect(commits[0]).toMatchObject({ deferred_retry_at: 2_000 })
  })

  it('keeps an untouched deferred Event’s earlier deadline after another force retry', async () => {
    const retried = makeEvent('018f8c7b-0000-7000-8000-000000000014')
    const untouched = makeEvent('018f8c7b-0000-7000-8000-000000000015')
    const replica: DurableReplica = {
      async readSyncInput() {
        return {
          workspace_id: retried.workspace_id,
          cursor: 0,
          pending_events: [retried],
          has_more_pending: false,
          failure_count: 0,
          deferred_count: 2,
          deferred_event_ids: [retried.event_id, untouched.event_id],
          deferred_events: [
            { event_id: retried.event_id, retry_at: 1_500, reason: 'Session is not indexed yet.' },
            { event_id: untouched.event_id, retry_at: 1_250, reason: 'Station is not indexed yet.' },
          ],
          retry_at: 1_250,
          last_failure: 'Station is not indexed yet.',
        }
      },
      async commit() {},
      async recordFailure() { throw new Error('unexpected') },
    }
    const exchange = new InMemoryEventExchange()
    exchange.push = async () => [{ kind: 'deferred', event_id: retried.event_id, reason: 'Session is not indexed yet.', retryable: true }]
    const coordinator = createSyncCoordinator(replica, exchange, { now: () => 1_000, retry_base_ms: 1_000, schedule: () => {} })

    await expect(coordinator.synchronize({ force: true })).resolves.toEqual({
      kind: 'deferred', deferred: 2, message: 'Session is not indexed yet.', retry_at: 1_250,
    })
  })

  it('keeps the original deferred reason visible when a forced retry exchange fails', async () => {
    const event = makeEvent()
    let now = 1_000
    let retryAt = 5_000
    const failures: Array<{ message: string; retryAt: number }> = []
    const replica: DurableReplica = {
      async readSyncInput() {
        return {
          workspace_id: event.workspace_id,
          cursor: 0,
          pending_events: [event],
          has_more_pending: false,
          failure_count: 1,
          deferred_count: 1,
          deferred_event_ids: [event.event_id],
          retry_at: retryAt,
          last_failure: 'Session is not indexed yet.',
        }
      },
      async commit() { throw new Error('unexpected') },
      async recordFailure(message, nextRetryAt) {
        failures.push({ message, retryAt: nextRetryAt })
        retryAt = nextRetryAt
      },
    }
    const exchange = new InMemoryEventExchange()
    exchange.push = async () => { throw new Error('temporary exchange failure') }
    const scheduled: number[] = []
    const coordinator = createSyncCoordinator(replica, exchange, {
      now: () => now,
      retry_base_ms: 500,
      schedule: (_run, delay) => scheduled.push(delay),
    })

    await expect(coordinator.synchronize({ force: true })).resolves.toEqual({
      kind: 'deferred', deferred: 1, message: 'Session is not indexed yet.', retry_at: 2_000,
    })
    expect(failures).toEqual([{ message: 'temporary exchange failure', retryAt: 2_000 }])
    expect(scheduled).toEqual([1_000])

    now = 1_500
    await expect(coordinator.synchronize()).resolves.toEqual({
      kind: 'deferred', deferred: 1, message: 'Session is not indexed yet.', retry_at: 2_000,
    })
    expect(failures).toHaveLength(1)
  })

  it('does not report Synced when a different queued Event remains deferred', async () => {
    const deferred = makeEvent('018f8c7b-0000-7000-8000-000000000012')
    const ordinary = makeEvent('018f8c7b-0000-7000-8000-000000000013')
    const commits: SyncCommit[] = []
    const replica: DurableReplica = {
      async readSyncInput() {
        return {
          workspace_id: ordinary.workspace_id,
          cursor: 0,
          pending_events: [ordinary],
          has_more_pending: true,
          failure_count: 1,
          deferred_count: 1,
          deferred_event_ids: [deferred.event_id],
          retry_at: 5_000,
          last_failure: 'Session is not indexed yet.',
        }
      },
      async commit(result) { commits.push(result) },
      async recordFailure() { throw new Error('unexpected') },
    }
    const exchange = new InMemoryEventExchange()
    const push = vi.spyOn(exchange, 'push')
    const coordinator = createSyncCoordinator(replica, exchange, { now: () => 1_000, schedule: () => {} })

    await expect(coordinator.synchronize()).resolves.toEqual({
      kind: 'deferred', deferred: 1, message: 'Session is not indexed yet.', retry_at: 5_000,
    })
    expect(push).toHaveBeenCalledWith([ordinary])
    expect(commits[0]?.receipts).toEqual([expect.objectContaining({ kind: 'accepted', event_id: ordinary.event_id })])
  })

  it('re-pulls a page after an interrupted durable commit instead of skipping its cursor', async () => {
    const remote = makeEvent('018f8c7b-0000-7000-8000-000000000011')
    const exchange = new InMemoryEventExchange([remote])
    const pull = vi.spyOn(exchange, 'pull')
    let cursor = 0
    let failureCount = 0
    let retryAt: number | undefined
    let lastFailure: string | undefined
    let interruptCommit = true
    const replica: DurableReplica = {
      async readSyncInput() {
        return {
          workspace_id: remote.workspace_id,
          cursor,
          pending_events: [],
          has_more_pending: false,
          failure_count: failureCount,
          retry_at: retryAt,
          last_failure: lastFailure,
        }
      },
      async commit(result) {
        if (interruptCommit) {
          interruptCommit = false
          throw new Error('simulated crash before transaction commit')
        }
        cursor = result.cursor
        failureCount = 0
        retryAt = undefined
        lastFailure = undefined
      },
      async recordFailure(message, nextRetryAt) {
        failureCount += 1
        retryAt = nextRetryAt
        lastFailure = message
      },
    }

    const beforeRestart = createSyncCoordinator(replica, exchange, { now: () => 10_000, retry_base_ms: 500, schedule: () => {} })
    await expect(beforeRestart.synchronize()).resolves.toEqual({
      kind: 'offline',
      message: 'simulated crash before transaction commit',
      retry_at: 10_500,
    })
    expect(cursor).toBe(0)

    const afterRestart = createSyncCoordinator(replica, exchange, { now: () => 10_500, retry_base_ms: 500, schedule: () => {} })
    await expect(afterRestart.synchronize()).resolves.toEqual({ kind: 'idle', last_synced_at: 10_500 })
    expect(cursor).toBe(1)
    expect(pull).toHaveBeenNthCalledWith(1, remote.workspace_id, 0, 100)
    expect(pull).toHaveBeenNthCalledWith(2, remote.workspace_id, 0, 100)
  })
})

describe('InMemoryEventExchange', () => {
  it('rejects a canonical alternate for an existing raw immutable Event', async () => {
    const raw = createEvent({
      event_id: '018f8c7b-0000-7000-8000-000000000016',
      event_type: 'session.created',
      event_schema_version: 1,
      workspace_id: '018f8c7b-0000-7000-8000-000000000001',
      command_id: '018f8c7b-0000-7000-8000-000000000002',
      actor: { kind: 'user-account', user_account_id: '018f8c7b-0000-7000-8000-000000000003' },
      payload: { session_id: '018f8c7b-0000-7000-8000-000000000017', session_date: '2026-08-13' },
    })
    const exchange = new InMemoryEventExchange([raw])

    await expect(exchange.push([upcastEvent(raw)])).resolves.toEqual([
      expect.objectContaining({ kind: 'rejected', event_id: raw.event_id, permanent: true }),
    ])
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
