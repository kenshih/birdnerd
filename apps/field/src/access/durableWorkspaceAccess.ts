/** Durable Field adapter for Workspace access, backed by the local Event Log. */
import { decidePendingMembershipActivation, resolveWorkspaceAccess } from '@birdnerd/banding'
import type { ExternalIdentity as EventExternalIdentity } from '@birdnerd/events'
import type { ExternalIdentity } from '../auth/authModule'
import type { WorkspaceAccessModule, WorkspaceAccessResult } from './workspaceAccessModule'
import { WorkspaceEventStore } from './workspaceEventStore'

/**
 * Resolve BirdNerd authorization from durable local Events. Pending-membership
 * activation is persisted before the active result is returned, so reopening
 * Field cannot repeat a successful activation as a new event group.
 */
export function createDurableWorkspaceAccess(store = new WorkspaceEventStore()): WorkspaceAccessModule {
  return {
    async resolve(identity: ExternalIdentity): Promise<WorkspaceAccessResult> {
      const eventIdentity = toEventIdentity(identity)
      if (!eventIdentity) return { kind: 'no-access' }

      const activation = decidePendingMembershipActivation(await store.snapshot(), eventIdentity)
      const results = await store.appendAll(activation)
      const rejected = results.find(result => result.kind === 'rejected')
      if (rejected?.kind === 'rejected') throw new Error(`Workspace access activation was rejected: ${rejected.reason}`)

      const resolution = resolveWorkspaceAccess(await store.snapshot(), eventIdentity)
      if (resolution.kind !== 'active') return { kind: 'no-access' }
      return {
        kind: 'active',
        access: {
          workspace_id: resolution.workspace.workspace_id,
          workspace_name: resolution.workspace.name,
          membership_id: resolution.workspace_membership.membership_id,
          role: resolution.workspace_membership.role,
          user_account_id: resolution.user_account.user_account_id,
        },
      }
    },
  }
}

function toEventIdentity(identity: ExternalIdentity): EventExternalIdentity | undefined {
  if (identity.provider !== 'google' || !identity.subject || !identity.email) return undefined
  return { provider: 'google', subject: identity.subject, email: identity.email.trim().toLowerCase() }
}
