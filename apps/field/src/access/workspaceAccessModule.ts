import type { ExternalIdentity } from '../auth/authModule'

export type WorkspaceAccess = {
  workspace_id: string
  workspace_name: string
  membership_id: string
  role: 'admin' | 'contributor'
  user_account_id: string
}

export type WorkspaceAccessResult =
  | { kind: 'active'; access: WorkspaceAccess }
  | { kind: 'no-access' }

/**
 * Field's Workspace-authorization seam. It deliberately accepts only the
 * external identity supplied by AuthModule and returns BirdNerd-owned access.
 * A provider must never grant Workspace access merely because it authenticated
 * someone successfully.
 */
export interface WorkspaceAccessModule {
  resolve(identity: ExternalIdentity): Promise<WorkspaceAccessResult>
}
