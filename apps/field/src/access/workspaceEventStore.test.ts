import { beforeEach, describe, expect, it } from 'vitest'
import { createEvent } from '@birdnerd/events'
import { resetWorkspaceEventStore, WorkspaceEventStore } from './workspaceEventStore'

const workspaceId = '018f8c7b-0000-7000-8000-000000000001'
const commandId = '018f8c7b-0000-7000-8000-000000000002'
const userId = '018f8c7b-0000-7000-8000-000000000003'

beforeEach(async () => {
  resetWorkspaceEventStore()
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('birdnerd-event-core')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
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
      payload: { session_id: '018f8c7b-0000-7000-8000-000000000005' },
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
      payload: { session_id: '018f8c7b-0000-7000-8000-000000000005' },
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
    payload: { session_id: eventId },
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
