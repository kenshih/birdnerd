/**
 * Test-only fixture for Playwright's local Vite server. It exercises the same
 * admission and activation path without exposing Workspace test data in a
 * production Field build.
 */

import { createEvent } from '@birdnerd/events'
import type { WorkspaceAccessModule } from './workspaceAccessModule'
import { createInMemoryWorkspaceAccess } from './localWorkspaceAccess'

export function createE2EWorkspaceAccessModule(): WorkspaceAccessModule {
  const workspaceId = '018f8c7b-0000-7000-8000-000000000001'
  return createInMemoryWorkspaceAccess([
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
  ])
}
