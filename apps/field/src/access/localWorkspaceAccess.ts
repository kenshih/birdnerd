/** In-memory Workspace access adapter for focused tests and the Playwright fixture. */

import { admitWorkspaceEvent, decidePendingMembershipActivation, resolveWorkspaceAccess } from '@birdnerd/banding'
import type { DomainEvent, ExternalIdentity as EventExternalIdentity } from '@birdnerd/events'
import { EventLog } from '@birdnerd/sync-state'
import type { ExternalIdentity } from '../auth/authModule'
import type { WorkspaceAccessModule, WorkspaceAccessResult } from './workspaceAccessModule'

export function createInMemoryWorkspaceAccess(initialEvents: readonly DomainEvent[] = []): WorkspaceAccessModule {
  const log = new EventLog(initialEvents, admitWorkspaceEvent)

  return {
    async resolve(identity: ExternalIdentity): Promise<WorkspaceAccessResult> {
      const eventIdentity = toEventIdentity(identity)
      if (!eventIdentity) return { kind: 'no-access' }

      const activation = decidePendingMembershipActivation(log.snapshot(), eventIdentity)
      for (const result of log.appendAll(activation)) {
        if (result.kind === 'rejected') throw new Error(`Workspace access activation was rejected: ${result.reason}`)
      }

      const resolution = resolveWorkspaceAccess(log.snapshot(), eventIdentity)
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
  return {
    provider: 'google',
    subject: identity.subject,
    email: identity.email.trim().toLowerCase(),
  }
}
