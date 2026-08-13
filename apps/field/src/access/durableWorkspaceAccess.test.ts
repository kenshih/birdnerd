import { describe, expect, it, beforeEach } from 'vitest'
import { createEvent } from '@birdnerd/events'
import { createDurableWorkspaceAccess } from './durableWorkspaceAccess'
import { resetWorkspaceEventStore, WorkspaceEventStore } from './workspaceEventStore'

const workspaceId = '018f8c7b-0000-7000-8000-000000000001'

beforeEach(async () => {
  resetWorkspaceEventStore()
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('birdnerd-event-core')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
})

describe('durable Workspace access', () => {
  it('persists matching-Membership activation and rebuilds access after a fresh store opens', async () => {
    const firstStore = new WorkspaceEventStore()
    await firstStore.appendAll([
      createEvent({
        event_type: 'workspace.created',
        workspace_id: workspaceId,
        command_id: '018f8c7b-0000-7000-8000-000000000002',
        actor: { kind: 'restricted-provisioner', provisioner_id: 'test' },
        payload: { workspace_id: workspaceId, name: 'Cedar Creek' },
      }),
      createEvent({
        event_type: 'membership.preauthorized',
        workspace_id: workspaceId,
        command_id: '018f8c7b-0000-7000-8000-000000000002',
        actor: { kind: 'restricted-provisioner', provisioner_id: 'test' },
        payload: { membership_id: '018f8c7b-0000-7000-8000-000000000003', email: 'bander@example.com', role: 'admin' },
      }),
    ])

    const identity = { provider: 'google' as const, subject: 'google-bander', email: 'bander@example.com' }
    const access = createDurableWorkspaceAccess(firstStore)
    await expect(Promise.all([access.resolve(identity), access.resolve(identity)])).resolves.toEqual([
      expect.objectContaining({ kind: 'active', access: expect.objectContaining({ workspace_name: 'Cedar Creek', role: 'admin' }) }),
      expect.objectContaining({ kind: 'active', access: expect.objectContaining({ workspace_name: 'Cedar Creek', role: 'admin' }) }),
    ])
    expect(await firstStore.snapshot()).toHaveLength(4)

    resetWorkspaceEventStore()
    const reopenedStore = new WorkspaceEventStore()
    await expect(createDurableWorkspaceAccess(reopenedStore).resolve(identity)).resolves.toMatchObject({
      kind: 'active', access: { workspace_name: 'Cedar Creek', role: 'admin' },
    })
    expect(await reopenedStore.snapshot()).toHaveLength(4)
  })
})
