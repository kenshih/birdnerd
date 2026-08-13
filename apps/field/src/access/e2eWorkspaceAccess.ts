/**
 * Test-only Phase 28 fixture for Playwright's local Vite server. It exercises
 * the same local event admission and access activation path without exposing
 * Workspace test data in a production Field build.
 */

import { createDraftEvent } from '@birdnerd/events'
import type { WorkspaceAccessModule } from './workspaceAccessModule'
import { createDraftLocalWorkspaceAccess } from './localWorkspaceAccess'

export function createE2EWorkspaceAccessModule(): WorkspaceAccessModule {
  const workspaceId = '018f8c7b-0000-7000-8000-000000000001'
  return createDraftLocalWorkspaceAccess([
    createDraftEvent({
      event_type: 'workspace.created',
      workspace_id: workspaceId,
      command_id: '018f8c7b-0000-7000-8000-000000000002',
      actor: { kind: 'restricted-provisioner', provisioner_id: 'playwright' },
      payload: { workspace_id: workspaceId, name: 'Playwright Field Workspace' },
    }),
    createDraftEvent({
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
