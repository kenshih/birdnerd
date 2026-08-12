/**
 * TEMPORARY Phase 28 local hand-off. This resolver uses only an in-memory
 * Event Log supplied by tests or a local harness, so the shipped PWA starts
 * with no Workspace access. Phase 29 replaces it with durable local storage;
 * Phase 30 hydrates it through authenticated sync from Supabase.
 */

import { admitWorkspaceEvent, decidePendingMembershipActivation, resolveWorkspaceAccess } from '@birdnerd/banding'
import type { DomainEvent, ExternalIdentity as EventExternalIdentity } from '@birdnerd/events'
import { LocalEventLog } from '@birdnerd/sync-state'
import type { ExternalIdentity } from '../auth/authModule'
import type { WorkspaceAccessModule, WorkspaceAccessResult } from './workspaceAccessModule'

export function createDraftLocalWorkspaceAccess(initialEvents: readonly DomainEvent[] = []): WorkspaceAccessModule {
  const log = new LocalEventLog(initialEvents, admitWorkspaceEvent)

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
          membership_id: resolution.membership.membership_id,
          role: resolution.membership.role,
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
