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
  const fixture = new URLSearchParams(window.location.search).get('e2eFixture')
  const accessEvents = [
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
  let seeded: ReturnType<typeof durable.resolve> | undefined
  return {
    async resolve(identity) {
      seeded ??= (async () => {
        await store.appendAll(accessEvents)
        const result = await durable.resolve(identity)
        if (result.kind === 'active') await store.appendAll(operationalFixtureEvents(fixture, result.access.workspace_id, result.access.user_account_id))
        return result
      })()
      const result = await seeded
      if (result.kind === 'active') store.activateWorkspace(result.access.workspace_id)
      return result
    },
  }
}

/** Optional query-scoped Events exercise historical projection paths in a browser without changing normal E2E seeds. */
function operationalFixtureEvents(fixture: string | null, workspaceId: string, userAccountId: string) {
  const actor = { kind: 'user-account' as const, user_account_id: userAccountId }
  if (fixture === 'legacy-band') {
    const sessionId = '018f8c7b-0000-7000-8000-000000000010'
    return [
      createEvent({
        event_id: '018f8c7b-0000-7000-8000-000000000020', event_schema_version: 1, event_type: 'session.created', workspace_id: workspaceId,
        command_id: '018f8c7b-0000-7000-8000-000000000012', actor,
        occurred_at: '2038-01-01T00:00:00.000Z', hlc: { physical_ms: 2_145_916_800_000, logical: 0 },
        payload: { session_id: sessionId, session_date: '2026-08-20' },
      }),
      createEvent({
        event_id: '018f8c7b-0000-7000-8000-000000000021', event_schema_version: 1, event_type: 'banding-record.created', workspace_id: workspaceId,
        command_id: '018f8c7b-0000-7000-8000-000000000012', actor,
        occurred_at: '2038-01-01T00:00:00.001Z', hlc: { physical_ms: 2_145_916_800_001, logical: 0 },
        payload: { record_id: '018f8c7b-0000-7000-8000-000000000011', session_id: sessionId, species_code: 'AMRO', band_number: '1154-81501' },
      }),
    ]
  }
  if (fixture === 'unresolved-managed-band') {
    const sessionId = '018f8c7b-0000-7000-8000-000000000030'
    const missingBandId = '018f8c7b-0000-7000-8000-000000000031'
    return [
      createEvent({
        event_id: '018f8c7b-0000-7000-8000-000000000040', event_type: 'session.created', workspace_id: workspaceId,
        command_id: '018f8c7b-0000-7000-8000-000000000032', actor,
        payload: { session_id: sessionId, fields: { session_date: '2026-08-22' } },
      }),
      createEvent({
        event_id: '018f8c7b-0000-7000-8000-000000000041', event_type: 'banding-record.created', workspace_id: workspaceId,
        command_id: '018f8c7b-0000-7000-8000-000000000032', actor,
        payload: {
          record_id: '018f8c7b-0000-7000-8000-000000000033', session_id: sessionId,
          fields: { species_code: 'AMRO', band_selection: { kind: 'managed', band_id: missingBandId, band_number: '1154-81502' } },
        },
      }),
    ]
  }
  return []
}
