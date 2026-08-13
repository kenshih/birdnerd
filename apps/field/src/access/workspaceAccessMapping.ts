/** Shared translation between Field authentication/UI seams and domain access rules. */
import type { AccessResolution } from '@birdnerd/banding'
import type { ExternalIdentity as EventExternalIdentity } from '@birdnerd/events'
import type { ExternalIdentity } from '../auth/authModule'
import type { WorkspaceAccessResult } from './workspaceAccessModule'

/** Convert a provider-neutral Field identity to the canonical event-identity shape. */
export function toEventIdentity(identity: ExternalIdentity): EventExternalIdentity | undefined {
  if (identity.provider !== 'google' || !identity.subject || !identity.email) return undefined
  return { provider: 'google', subject: identity.subject, email: identity.email.trim().toLowerCase() }
}

/** Map a domain access projection into the Field UI seam without granting access from an external identity alone. */
export function toWorkspaceAccessResult(resolution: AccessResolution): WorkspaceAccessResult {
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
}
