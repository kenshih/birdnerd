import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEvent, createUuidV7, upcastEvent, type PersistedEvent } from '@birdnerd/events'
import { createSyncCoordinator, InMemoryEventExchange } from '@birdnerd/sync-state'
import { openDB } from 'idb'
import { createWorkspaceEventBundle, parseWorkspaceEventBundle } from '../utils/eventBundle'
import { resetWorkspaceEventStore, WorkspaceEventStore } from './workspaceEventStore'

const workspaceId = '018f8c7b-0000-7000-8000-000000000001'
const commandId = '018f8c7b-0000-7000-8000-000000000002'
const userId = '018f8c7b-0000-7000-8000-000000000003'

beforeEach(async () => {
  resetWorkspaceEventStore()
  await deleteWorkspaceEventDatabase()
})

describe('WorkspaceEventStore replica exchange', () => {
  it('does not advance its pull cursor until received Events and projection are durable', async () => {
    const store = new WorkspaceEventStore()
    store.activateWorkspace(workspaceId)
    const remote = sessionEvent('018f8c7b-0000-7000-8000-000000000004')
    await store.commit({ receipts: [], pulled: [{ event: remote, server_sequence: 7 }], cursor: 7 })
    expect((await store.readSyncInput(100, Date.now()))?.cursor).toBe(7)
    expect(await store.snapshot()).toContainEqual(remote)

    resetWorkspaceEventStore()
    const reopened = new WorkspaceEventStore()
    reopened.activateWorkspace(workspaceId)
    expect((await reopened.readSyncInput(100, Date.now()))?.cursor).toBe(7)
    expect(await reopened.snapshot()).toContainEqual(remote)
  })

  it('keeps network failures pending and excludes a permanent rejection from the effective projection', async () => {
    const store = new WorkspaceEventStore()
    store.activateWorkspace(workspaceId)
    await seedAccess(store)
    const local = sessionEvent('018f8c7b-0000-7000-8000-000000000004')
    await store.appendAll([local])
    await store.recordFailure('offline', 5000)
    expect((await store.readSyncInput(100, 4999))?.pending_events).toEqual([local])
    expect((await store.diagnostics(workspaceId)).queue[0]?.retry_at).toBe(5000)

    resetWorkspaceEventStore()
    const reopened = new WorkspaceEventStore()
    reopened.activateWorkspace(workspaceId)
    expect(await reopened.readSyncInput(100, 4999)).toMatchObject({ retry_at: 5000, failure_count: 1 })

    await reopened.commit({ receipts: [{ kind: 'rejected', event_id: local.event_id, reason: 'not admitted', permanent: true }], pulled: [], cursor: 0 })
    expect(await reopened.snapshot()).not.toContainEqual(local)
    const diagnostics = await reopened.diagnostics(workspaceId)
    expect(diagnostics.queue[0]).toMatchObject({ status: 'rejected', last_error: 'not admitted' })
    expect(diagnostics.commands.flatMap(command => command.events)).toContainEqual(local)
    expect(diagnostics.receipts[0]?.receipt).toMatchObject({ kind: 'rejected', event_id: local.event_id })
  })

  it('protects unsynced local Events across recovery replacement', async () => {
    const store = new WorkspaceEventStore()
    store.activateWorkspace(workspaceId)
    await seedAccess(store)
    const pending = sessionEvent('018f8c7b-0000-7000-8000-000000000004')
    const bundled = sessionEvent('018f8c7b-0000-7000-8000-000000000005')
    await store.appendAll([pending])
    await expect(store.restoreWorkspace(workspaceId, [bundled])).resolves.toEqual({ protected_pending: 1 })
    expect(await store.snapshot()).toEqual(expect.arrayContaining([pending, bundled]))
    expect((await store.readSyncInput(100, Date.now()))?.pending_events).toEqual([pending])
  })

  it('rejects conflicting Bundle content before replacing the replica', async () => {
    const store = new WorkspaceEventStore()
    store.activateWorkspace(workspaceId)
    await seedAccess(store)
    const pending = sessionEvent('018f8c7b-0000-7000-8000-000000000004')
    const conflicting = createEvent({
      ...pending,
      payload: { session_id: '018f8c7b-0000-7000-8000-000000000005', fields: {} },
    })
    await store.appendAll([pending])

    await expect(store.restoreWorkspace(workspaceId, [conflicting])).rejects.toThrow('conflicts')
    expect(await store.snapshot()).toContainEqual(pending)
  })

  it('rejects a Bundle that conflicts with an already accepted Event before replacement', async () => {
    const store = new WorkspaceEventStore()
    store.activateWorkspace(workspaceId)
    const accepted = sessionEvent('018f8c7b-0000-7000-8000-000000000004')
    const conflicting = createEvent({
      ...accepted,
      payload: { session_id: '018f8c7b-0000-7000-8000-000000000005', fields: {} },
    })
    await store.appendAcceptedRemote([{ event: accepted, server_sequence: 1 }])

    await expect(store.restoreWorkspace(workspaceId, [conflicting])).rejects.toThrow('conflicts')
    expect(await store.snapshot()).toEqual([accepted])
  })

  it('commits mixed accepted and rejected receipts without requeueing either result', async () => {
    const store = new WorkspaceEventStore()
    store.activateWorkspace(workspaceId)
    await seedAccess(store)
    const accepted = sessionEvent('018f8c7b-0000-7000-8000-000000000004')
    const rejected = sessionEvent('018f8c7b-0000-7000-8000-000000000005')
    await store.appendAll([accepted, rejected])

    await store.commit({
      receipts: [
        { kind: 'accepted', event_id: accepted.event_id, server_sequence: 5 },
        { kind: 'rejected', event_id: rejected.event_id, reason: 'not admitted', permanent: true },
      ],
      pulled: [],
      cursor: 4,
    })

    expect((await store.readSyncInput(100, Date.now()))?.pending_events).toEqual([])
    expect(await store.snapshot()).toEqual(expect.arrayContaining([accepted]))
    expect(await store.snapshot()).not.toContainEqual(rejected)
    expect((await store.diagnostics(workspaceId)).queue).toEqual(expect.arrayContaining([
      expect.objectContaining({ event_id: accepted.event_id, status: 'accepted' }),
      expect.objectContaining({ event_id: rejected.event_id, status: 'rejected' }),
    ]))
  })

  it('keeps a deferred admission dependency effective and pending across restart', async () => {
    const store = new WorkspaceEventStore()
    store.activateWorkspace(workspaceId)
    await seedAccess(store)
    const local = sessionEvent('018f8c7b-0000-7000-8000-000000000004')
    await store.appendAll([local])
    await store.commit({ receipts: [{ kind: 'deferred', event_id: local.event_id, reason: 'Station is not indexed yet.', retryable: true }], pulled: [], cursor: 0, deferred_retry_at: 5000 })
    expect(await store.snapshot()).toContainEqual(local)
    expect(await store.readSyncInput(100, 1000)).toMatchObject({
      pending_events: [local], deferred_count: 1, deferred_event_ids: [local.event_id], retry_at: 5000,
    })
    expect((await store.diagnostics(workspaceId)).queue[0]).toMatchObject({ status: 'pending', attempt_count: 1, retry_at: 5000 })

    await store.recordFailure('temporary exchange failure', 7_000)
    expect(await store.readSyncInput(100, 1_000)).toMatchObject({
      deferred_count: 1,
      deferred_event_ids: [local.event_id],
      last_failure: 'Station is not indexed yet.',
      retry_at: 7_000,
    })
    expect((await store.diagnostics(workspaceId)).queue[0]).toMatchObject({
      deferred: true,
      last_error: 'Station is not indexed yet.',
      retry_at: 7_000,
    })
  })

  it('upgrades a released v2 deferred queue without misclassifying an offline retry', async () => {
    const deferred = sessionEvent('018f8c7b-0000-7000-8000-000000000047')
    const offline = sessionEvent('018f8c7b-0000-7000-8000-000000000048')
    const legacy = await openDB('birdnerd-event-core', 2, {
      upgrade(database, oldVersion) {
        if (oldVersion < 1) {
          const eventLog = database.createObjectStore('event_log', { keyPath: 'event_id' })
          eventLog.createIndex('by-workspace', 'workspace_id')
          database.createObjectStore('projection_cache', { keyPath: 'cache_key' })
        }
        if (oldVersion < 2) {
          const queue = database.createObjectStore('outbound_queue', { keyPath: 'event_id' })
          queue.createIndex('by-workspace', 'workspace_id')
          queue.createIndex('by-status', 'status')
          database.createObjectStore('sync_metadata', { keyPath: 'workspace_id' })
          database.createObjectStore('receipts', { keyPath: 'event_id' })
        }
      },
    })
    await legacy.put('event_log', deferred)
    await legacy.put('event_log', offline)
    await legacy.put('outbound_queue', {
      event_id: deferred.event_id, workspace_id: workspaceId, status: 'pending', attempt_count: 1, retry_at: 5_000,
      last_error: 'Session is not indexed yet.',
    })
    await legacy.put('outbound_queue', {
      event_id: offline.event_id, workspace_id: workspaceId, status: 'pending', attempt_count: 1, retry_at: 5_000,
      last_error: 'network unavailable',
    })
    await legacy.put('receipts', {
      event_id: deferred.event_id,
      receipt: { kind: 'deferred', event_id: deferred.event_id, reason: 'Session is not indexed yet.', retryable: true },
      recorded_at: 1_000,
    })
    await legacy.put('sync_metadata', {
      workspace_id: workspaceId, cursor: 0, last_failure: 'Session is not indexed yet.', retry_at: 5_000, failure_count: 1, deferred_count: 1,
    })
    await legacy.put('projection_cache', {
      cache_key: 'workspace-current-state', event_ids: ['stale-cache-entry'],
      workspace_access: { projection_version: 1, workspaces: [], workspace_memberships: [], user_accounts: [] },
      sessions: [], banding_records: [], band_allocation_conflicts: [], operational_entities: [], operational_session_crew: [], operational_unresolved_references: [], band_number_conflicts: [],
    })
    legacy.close()

    const store = new WorkspaceEventStore()
    store.activateWorkspace(workspaceId)
    await store.snapshot() // v3 opens, upgrades queue metadata, then rebuilds the stale cache.

    expect(await store.readSyncInput(100, 1_000)).toMatchObject({
      deferred_count: 1,
      deferred_event_ids: [deferred.event_id],
      last_failure: 'Session is not indexed yet.',
      retry_at: 5_000,
    })
    expect((await store.diagnostics(workspaceId)).queue).toEqual(expect.arrayContaining([
      expect.objectContaining({ event_id: deferred.event_id, deferred: true, last_error: 'Session is not indexed yet.' }),
      expect.objectContaining({ event_id: offline.event_id, deferred: false, last_error: 'network unavailable' }),
    ]))
    expect((await store.diagnostics(workspaceId)).projection.event_ids).toEqual(expect.arrayContaining([deferred.event_id, offline.event_id]))

    const coordinator = createSyncCoordinator(store, new InMemoryEventExchange(), { now: () => 1_000, schedule: () => {} })
    await expect(coordinator.synchronize()).resolves.toEqual({
      kind: 'deferred', deferred: 1, message: 'Session is not indexed yet.', retry_at: 5_000,
    })
  })

  it('sends a raw Phase 30 Event unchanged through a lost-receipt retry and server duplicate', async () => {
    const raw = createEvent({
      event_id: createUuidV7(Date.now() + 10_000), event_type: 'session.created', event_schema_version: 1,
      workspace_id: workspaceId, command_id: commandId, actor: { kind: 'user-account', user_account_id: userId },
      payload: { session_id: '018f8c7b-0000-7000-8000-000000000042', session_date: '2026-08-13' },
    })
    const store = new WorkspaceEventStore()
    store.activateWorkspace(workspaceId)
    await seedAccess(store)

    const database = await openDB('birdnerd-event-core', 3)
    await database.put('event_log', raw)
    await database.put('outbound_queue', {
      event_id: raw.event_id, workspace_id: workspaceId, status: 'pending', attempt_count: 1, retry_at: 0,
    })
    database.close()

    // A previous request was accepted remotely but its receipt was lost.
    // Retrying the original raw v1 JSON must receive an idempotent duplicate.
    await store.recordFailure('lost receipt', 5_000)
    expect((await store.readSyncInput(100, 1_000))?.pending_events).toEqual([raw])
    const exchange = new InMemoryEventExchange([raw])
    const push = vi.spyOn(exchange, 'push')
    const coordinator = createSyncCoordinator(store, exchange, { now: () => 1_000, schedule: () => {} })

    await expect(coordinator.synchronize({ force: true })).resolves.toEqual({ kind: 'idle', last_synced_at: 1_000 })
    expect(push).toHaveBeenCalledWith([raw])
    expect((await store.diagnostics(workspaceId)).receipts).toEqual(expect.arrayContaining([
      expect.objectContaining({ event_id: raw.event_id, receipt: expect.objectContaining({ kind: 'duplicate' }) }),
    ]))
    const reloaded = await openDB('birdnerd-event-core', 3)
    expect(await reloaded.get('event_log', raw.event_id)).toEqual(raw)
    reloaded.close()
  })

  it('makes every deferred raw Event eligible for Sync Now ahead of a full normal batch', async () => {
    const normal = sessionEvent('018f8c7b-0000-7000-8000-000000000050')
    const deferred = createEvent({
      event_id: '018f8c7b-0000-7000-8000-000000000051', event_type: 'session.created', event_schema_version: 1,
      workspace_id: workspaceId, command_id: commandId, actor: { kind: 'user-account', user_account_id: userId },
      payload: { session_id: '018f8c7b-0000-7000-8000-000000000052', session_date: '2026-08-13' },
    })
    const store = new WorkspaceEventStore()
    store.activateWorkspace(workspaceId)
    await seedAccess(store)
    await store.appendAll([normal, deferred])
    await store.commit({
      receipts: [{ kind: 'deferred', event_id: deferred.event_id, reason: 'Session is not indexed yet.', retryable: true }],
      pulled: [], cursor: 0, deferred_retry_at: 5_000,
    })

    expect((await store.readSyncInput(1, 1_000))?.pending_events).toEqual([normal])
    const exchange = new InMemoryEventExchange()
    const push = vi.spyOn(exchange, 'push')
    const coordinator = createSyncCoordinator(store, exchange, { batch_size: 1, now: () => 1_000, schedule: () => {} })

    await coordinator.synchronize({ force: true })
    expect(push).toHaveBeenCalledWith([deferred])
  })

  it('keeps the first durable raw Event representation through equivalent local, remote, pull, and Bundle duplicates', async () => {
    const raw = createEvent({
      event_id: createUuidV7(Date.now() + 10_000), event_type: 'session.created', event_schema_version: 1,
      workspace_id: workspaceId, command_id: commandId, actor: { kind: 'user-account', user_account_id: userId },
      payload: { session_id: '018f8c7b-0000-7000-8000-000000000042', session_date: '2026-08-13' },
    })
    const canonical = upcastEvent(raw)
    const store = new WorkspaceEventStore()
    store.activateWorkspace(workspaceId)
    await seedAccess(store)
    await store.appendAcceptedRemote([{ event: raw, server_sequence: 1 }])
    await store.appendAll([canonical])
    await store.appendAcceptedRemote([{ event: canonical, server_sequence: 1 }])
    await store.commit({ receipts: [], pulled: [{ event: canonical, server_sequence: 1 }], cursor: 1 })
    await store.restoreWorkspace(workspaceId, [canonical])

    const database = await openDB('birdnerd-event-core', 3)
    expect(await database.get('event_log', raw.event_id)).toEqual(raw)
    database.close()
    expect(await store.snapshot()).toContainEqual(canonical)
  })

  it('retains the first accepted raw Event from a duplicate or conflicting local batch', async () => {
    const raw = createEvent({
      event_id: '018f8c7b-0000-7000-8000-000000000042', event_type: 'session.created', event_schema_version: 1,
      workspace_id: workspaceId, command_id: commandId, actor: { kind: 'user-account', user_account_id: userId },
      payload: { session_id: '018f8c7b-0000-7000-8000-000000000043', session_date: '2026-08-13' },
    })
    const canonical = upcastEvent(raw)
    const conflict = createEvent({ ...raw, payload: { session_id: '018f8c7b-0000-7000-8000-000000000044', session_date: '2026-08-14' } })
    const store = new WorkspaceEventStore()
    store.activateWorkspace(workspaceId)
    await seedAccess(store)

    await expect(store.appendAll([raw, canonical, conflict])).resolves.toMatchObject([
      { kind: 'accepted' }, { kind: 'duplicate' }, { kind: 'rejected' },
    ])
    const database = await openDB('birdnerd-event-core', 3)
    expect(await database.get('event_log', raw.event_id)).toEqual(raw)
    database.close()
  })

  it('does not carry a deferred retry from Workspace A into Workspace B sync metadata', async () => {
    const workspaceB = '018f8c7b-0000-7000-8000-000000000007'
    const store = new WorkspaceEventStore()
    store.activateWorkspace(workspaceId)
    await seedAccess(store)
    const pendingA = sessionEvent('018f8c7b-0000-7000-8000-000000000004')
    await store.appendAll([pendingA])
    await store.commit({ receipts: [{ kind: 'deferred', event_id: pendingA.event_id, reason: 'Station is not indexed yet.', retryable: true }], pulled: [], cursor: 0, deferred_retry_at: 5000 })

    store.activateWorkspace(workspaceB)
    const remoteB = createEvent({
      event_id: '018f8c7b-0000-7000-8000-000000000045', event_type: 'session.created', event_schema_version: 1,
      workspace_id: workspaceB, command_id: commandId, actor: { kind: 'user-account', user_account_id: userId },
      payload: { session_id: '018f8c7b-0000-7000-8000-000000000046', session_date: '2026-08-14' },
    })
    await store.commit({ receipts: [], pulled: [{ event: remoteB, server_sequence: 1 }], cursor: 1 })

    expect(await store.readSyncInput(100, 1000)).toMatchObject({
      workspace_id: workspaceB, cursor: 1, deferred_count: 0, deferred_event_ids: [],
    })
    expect((await store.diagnostics(workspaceId)).metadata).toMatchObject({ deferred_count: 1, retry_at: 5000 })
    expect((await store.diagnostics(workspaceId)).queue).toEqual(expect.arrayContaining([
      expect.objectContaining({ event_id: pendingA.event_id, workspace_id: workspaceId, status: 'pending', deferred: true }),
    ]))
  })

  it('replays raw Phase 30 Events canonically through a later commit and reload', async () => {
    // This is the stored v1 shape from the released Phase 30 replica, not a
    // v1 Event inserted into a fresh Phase 31 projection fixture.
    const historicSessionId = '018f8c7b-0000-7000-8000-000000000042'
    const historicSession = createEvent({
      event_id: '018f8c7b-0000-7000-8000-000000000041', event_type: 'session.created', event_schema_version: 1,
      workspace_id: workspaceId, command_id: commandId, actor: { kind: 'user-account', user_account_id: userId },
      payload: { session_id: historicSessionId, session_date: '2026-08-13' },
    })
    const historicRecord = createEvent({
      event_id: '018f8c7b-0000-7000-8000-000000000043', event_type: 'banding-record.created', event_schema_version: 1,
      workspace_id: workspaceId, command_id: commandId, actor: { kind: 'user-account', user_account_id: userId },
      payload: { record_id: '018f8c7b-0000-7000-8000-000000000044', session_id: historicSessionId, species_code: 'AMRO', band_number: '1154-81501' },
    })

    const initializingStore = new WorkspaceEventStore()
    initializingStore.activateWorkspace(workspaceId)
    await initializingStore.commit({ receipts: [], pulled: [], cursor: 0 })
    resetWorkspaceEventStore()
    const database = await openDB('birdnerd-event-core', 3)
    await database.put('event_log', historicSession)
    await database.put('event_log', historicRecord)
    await database.put('projection_cache', {
      cache_key: 'workspace-current-state',
      event_ids: ['018f8c7b-0000-7000-8000-000000000040'],
      workspace_access: { projection_version: 1, workspaces: [], workspace_memberships: [], user_accounts: [] },
      sessions: [{ session_id: historicSessionId, created_by: userId, session_date: '2026-08-13' }],
      banding_records: [{ record_id: '018f8c7b-0000-7000-8000-000000000044', session_id: historicSessionId, created_by: userId, species_code: 'WIWA', field_event_ids: { species_code: '018f8c7b-0000-7000-8000-000000000040' } }],
      band_allocation_conflicts: [],
      operational_entities: [],
      operational_session_crew: [],
      operational_unresolved_references: [],
      band_number_conflicts: [],
    })
    database.close()

    const store = new WorkspaceEventStore()
    store.activateWorkspace(workspaceId)
    await store.snapshot() // hydrate/replay the raw Phase 30 state first
    const hydratedDatabase = await openDB('birdnerd-event-core', 3)
    expect(await hydratedDatabase.get('event_log', historicRecord.event_id)).toEqual(historicRecord)
    expect((await hydratedDatabase.get('projection_cache', 'workspace-current-state'))?.banding_records)
      .toEqual(expect.arrayContaining([expect.objectContaining({ record_id: '018f8c7b-0000-7000-8000-000000000044', species_code: 'AMRO', band_number: '1154-81501' })]))
    hydratedDatabase.close()
    const newer = sessionEvent('018f8c7b-0000-7000-8000-000000000045')
    await store.commit({ receipts: [], pulled: [{ event: newer, server_sequence: 1 }], cursor: 1 })
    expect(await store.snapshot()).toEqual(expect.arrayContaining([
      expect.objectContaining({ event_id: historicRecord.event_id, event_schema_version: 2, payload: expect.objectContaining({ fields: expect.objectContaining({ species_code: 'AMRO', band_number: '1154-81501' }) }) }),
    ]))

    resetWorkspaceEventStore()
    const reopened = new WorkspaceEventStore()
    reopened.activateWorkspace(workspaceId)
    expect(await reopened.snapshot()).toEqual(expect.arrayContaining([
      expect.objectContaining({ event_id: historicRecord.event_id, event_schema_version: 2, payload: expect.objectContaining({ fields: expect.objectContaining({ species_code: 'AMRO', band_number: '1154-81501' }) }) }),
    ]))
  })

  it('rehydrates raw Phase 30 Events in HLC order before accepting a later correction', async () => {
    const historicSessionId = '018f8c7b-0000-7000-8000-000000000010'
    const historicRecordId = '018f8c7b-0000-7000-8000-000000000011'
    const historicSession = createEvent({
      event_id: '018f8c7b-0000-7000-8000-000000000021', event_schema_version: 1, event_type: 'session.created', workspace_id: workspaceId,
      command_id: commandId, actor: { kind: 'user-account', user_account_id: userId },
      occurred_at: '2038-01-01T00:00:00.000Z', hlc: { physical_ms: 2_145_916_800_000, logical: 0 },
      payload: { session_id: historicSessionId, session_date: '2026-08-20' },
    })
    const historicRecord = createEvent({
      event_id: '018f8c7b-0000-7000-8000-000000000020', event_schema_version: 1, event_type: 'banding-record.created', workspace_id: workspaceId,
      command_id: commandId, actor: { kind: 'user-account', user_account_id: userId },
      occurred_at: '2038-01-01T00:00:00.001Z', hlc: { physical_ms: 2_145_916_800_001, logical: 0 },
      payload: { record_id: historicRecordId, session_id: historicSessionId, species_code: 'AMRO', band_number: '1154-81501' },
    })
    const store = new WorkspaceEventStore()
    store.activateWorkspace(workspaceId)
    await seedAccess(store)
    await store.appendAll([historicSession, historicRecord])

    resetWorkspaceEventStore()
    const reopened = new WorkspaceEventStore()
    reopened.activateWorkspace(workspaceId)
    const hydrated = await reopened.snapshot()
    expect(hydrated.findIndex(event => event.event_id === historicSession.event_id)).toBeLessThan(hydrated.findIndex(event => event.event_id === historicRecord.event_id))
    const hydratedDatabase = await openDB('birdnerd-event-core', 3)
    expect(await hydratedDatabase.get('event_log', historicRecord.event_id)).toEqual(historicRecord)
    hydratedDatabase.close()
    const correction = createEvent({
      event_id: '018f8c7b-0000-7000-8000-000000000019', event_type: 'banding-record.fields-amended', workspace_id: workspaceId,
      command_id: '018f8c7b-0000-7000-8000-000000000023', actor: { kind: 'user-account', user_account_id: userId },
      occurred_at: '2038-01-01T00:00:00.002Z', hlc: { physical_ms: 2_145_916_800_002, logical: 0 },
      payload: { record_id: historicRecordId, fields: { notes: 'Corrected historical note' } },
    })

    await expect(reopened.appendAll([correction])).resolves.toEqual([
      expect.objectContaining({ kind: 'accepted', event: correction }),
    ])

    resetWorkspaceEventStore()
    const reloaded = new WorkspaceEventStore()
    reloaded.activateWorkspace(workspaceId)
    const replayed = await reloaded.snapshot()
    expect(replayed.findIndex(event => event.event_id === historicSession.event_id)).toBeLessThan(replayed.findIndex(event => event.event_id === historicRecord.event_id))
    expect(replayed.findIndex(event => event.event_id === historicRecord.event_id)).toBeLessThan(replayed.findIndex(event => event.event_id === correction.event_id))
  })

  it('exports and restores raw Phase 30 Event JSON while canonical replay catches up safely', async () => {
    const historicSessionId = '018f8c7b-0000-7000-8000-000000000042'
    const historicRecordId = '018f8c7b-0000-7000-8000-000000000044'
    const historicSession = createEvent({
      event_id: '018f8c7b-0000-7000-8000-000000000041', event_type: 'session.created', event_schema_version: 1,
      workspace_id: workspaceId, command_id: commandId, actor: { kind: 'user-account', user_account_id: userId },
      payload: { session_id: historicSessionId, session_date: '2026-08-13' },
    })
    const historicRecord = createEvent({
      event_id: '018f8c7b-0000-7000-8000-000000000043', event_type: 'banding-record.created', event_schema_version: 1,
      workspace_id: workspaceId, command_id: commandId, actor: { kind: 'user-account', user_account_id: userId },
      payload: { record_id: historicRecordId, session_id: historicSessionId, species_code: 'AMRO' },
    })
    const source = new WorkspaceEventStore()
    source.activateWorkspace(workspaceId)
    await source.appendAcceptedRemote([
      { event: historicSession, server_sequence: 1 },
      { event: historicRecord, server_sequence: 2 },
    ])

    const bundle = await createWorkspaceEventBundle(workspaceId, await source.exportWorkspaceEvents(workspaceId))
    const parsed = await parseWorkspaceEventBundle(JSON.stringify(bundle))
    expect(parsed.events.find(candidate => candidate.event_id === historicRecord.event_id)).toEqual(historicRecord)

    resetWorkspaceEventStore()
    await deleteWorkspaceEventDatabase()
    const restored = new WorkspaceEventStore()
    restored.activateWorkspace(workspaceId)
    await restored.restoreWorkspace(workspaceId, parsed.events)

    const database = await openDB('birdnerd-event-core', 3)
    expect(await database.get('event_log', historicRecord.event_id)).toEqual(historicRecord)
    database.close()
    expect((await restored.diagnostics(workspaceId)).projection.banding_records
      .find(record => record.record_id === historicRecordId))
      .toMatchObject({ species_code: 'AMRO' })

    const coordinator = createSyncCoordinator(restored, new InMemoryEventExchange([historicSession, historicRecord]), {
      now: () => 5_000,
      schedule: () => {},
    })
    await expect(coordinator.synchronize()).resolves.toEqual({ kind: 'idle', last_synced_at: 5_000 })
    expect((await restored.readSyncInput(100, 5_000))?.cursor).toBe(2)
  })

  it('restores a raw pre-envelope access Event without rewriting its stored history', async () => {
    const current = createEvent({
      event_id: '018f8c7b-0000-7000-8000-000000000041',
      event_type: 'workspace.created',
      workspace_id: workspaceId,
      command_id: commandId,
      actor: { kind: 'restricted-provisioner', provisioner_id: 'test' },
      payload: { workspace_id: workspaceId, name: 'Cedar Creek' },
    })
    const { event_envelope_version: _version, hlc: _hlc, ...historic } = current
    const bundle = await createWorkspaceEventBundle(workspaceId, [historic as PersistedEvent])
    const parsed = await parseWorkspaceEventBundle(JSON.stringify(bundle))
    const store = new WorkspaceEventStore()
    store.activateWorkspace(workspaceId)
    await store.restoreWorkspace(workspaceId, parsed.events)

    const database = await openDB('birdnerd-event-core', 3)
    expect(await database.get('event_log', current.event_id)).toEqual(historic)
    database.close()
    expect(await store.snapshot()).toContainEqual(current)
  })

  it('scopes a replica snapshot to one Workspace', async () => {
    const store = new WorkspaceEventStore()
    const first = sessionEvent('018f8c7b-0000-7000-8000-000000000004')
    const second = createEvent({
      ...sessionEvent('018f8c7b-0000-7000-8000-000000000005'),
      workspace_id: '018f8c7b-0000-7000-8000-000000000007',
    })
    await store.appendAcceptedRemote([
      { event: first, server_sequence: 1 },
      { event: second, server_sequence: 2 },
    ])

    expect(await store.snapshot(workspaceId)).toEqual([first])
  })
})

function sessionEvent(eventId: string) {
  return createEvent({
    event_id: eventId,
    event_type: 'session.created',
    workspace_id: workspaceId,
    command_id: commandId,
    actor: { kind: 'user-account', user_account_id: userId },
    payload: { session_id: eventId, fields: {} },
  })
}

async function seedAccess(store: WorkspaceEventStore) {
  const identity = { provider: 'google' as const, subject: 'google-subject', email: 'member@example.com' }
  const membershipId = '018f8c7b-0000-7000-8000-000000000006'
  const access = [
    createEvent({ event_type: 'workspace.created', workspace_id: workspaceId, command_id: commandId, actor: { kind: 'restricted-provisioner', provisioner_id: 'test' }, payload: { workspace_id: workspaceId, name: 'Test' } }),
    createEvent({ event_type: 'membership.preauthorized', workspace_id: workspaceId, command_id: commandId, actor: { kind: 'restricted-provisioner', provisioner_id: 'test' }, payload: { membership_id: membershipId, email: identity.email, role: 'admin' } }),
    createEvent({ event_type: 'user-account.linked', workspace_id: workspaceId, command_id: commandId, actor: { kind: 'external-identity', identity }, payload: { user_account_id: userId, identity } }),
    createEvent({ event_type: 'membership.activated', workspace_id: workspaceId, command_id: commandId, actor: { kind: 'external-identity', identity }, payload: { membership_id: membershipId, user_account_id: userId } }),
  ]
  await store.appendAcceptedRemote(access.map((event, index) => ({ event, server_sequence: index + 1 })))
}

async function deleteWorkspaceEventDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('birdnerd-event-core')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
