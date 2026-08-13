import { describe, expect, it } from 'vitest'
import { createEvent } from '@birdnerd/events'
import { createInMemoryWorkspaceAccess } from './localWorkspaceAccess'

describe('in-memory Workspace access', () => {
  it('activates a matching pending Membership exactly once before returning active access', async () => {
    const workspaceId = '018f8c7b-0000-7000-8000-000000000001'
    const initialEvents = [
      createEvent({
        event_type: 'workspace.created',
        workspace_id: workspaceId,
        command_id: '018f8c7b-0000-7000-8000-000000000002',
        actor: { kind: 'restricted-provisioner', provisioner_id: 'local-admin' },
        payload: { workspace_id: workspaceId, name: 'Cedar Creek' },
      }),
      createEvent({
        event_type: 'membership.preauthorized',
        workspace_id: workspaceId,
        command_id: '018f8c7b-0000-7000-8000-000000000002',
        actor: { kind: 'restricted-provisioner', provisioner_id: 'local-admin' },
        payload: {
          membership_id: '018f8c7b-0000-7000-8000-000000000003',
          email: 'bander@example.com',
          role: 'admin',
        },
      }),
    ]
    const access = createInMemoryWorkspaceAccess(initialEvents)
    const identity = { provider: 'google', subject: 'google-bander', email: 'bander@example.com' }

    await expect(access.resolve(identity)).resolves.toMatchObject({
      kind: 'active',
      access: { workspace_name: 'Cedar Creek', role: 'admin' },
    })
    await expect(access.resolve(identity)).resolves.toMatchObject({ kind: 'active' })
  })
})
