/**
 * Test-only fixture for Playwright's local Vite server. It exercises the same
 * admission and activation path without exposing Workspace test data in a
 * production Field build.
 */

import { createEvent } from '@birdnerd/events'
import type { WorkspaceAccessModule } from './workspaceAccessModule'
import { createDurableWorkspaceAccess } from './durableWorkspaceAccess'
import { getFieldCollaboration } from '../sync/fieldCollaboration'

export function createE2EWorkspaceAccessModule(): WorkspaceAccessModule {
  const workspaceId = '018f8c7b-0000-7000-8000-000000000001'
  const events = [
    createEvent({
      event_type: 'workspace.created',
      workspace_id: workspaceId,
      command_id: '018f8c7b-0000-7000-8000-000000000002',
      actor: { kind: 'restricted-provisioner', provisioner_id: 'playwright' },
      payload: { workspace_id: workspaceId, name: 'Playwright Field Workspace' },
    }),
    createEvent({
      event_type: 'membership.preauthorized',
      workspace_id: workspaceId,
      command_id: '018f8c7b-0000-7000-8000-000000000002',
      actor: { kind: 'restricted-provisioner', provisioner_id: 'playwright' },
      payload: {
        membership_id: '018f8c7b-0000-7000-8000-000000000003',
        email: 'playwright-admin@example.com',
        role: 'admin',
      },
    }),
  ]
  const { store } = getFieldCollaboration()
  const durable = createDurableWorkspaceAccess(store)
  let seeded: Promise<unknown> | undefined
  return {
    async resolve(identity) {
      seeded ??= store.appendAll(events)
      await seeded
      const result = await durable.resolve(identity)
      if (result.kind === 'active') store.activateWorkspace(result.access.workspace_id)
      return result
    },
  }
}
