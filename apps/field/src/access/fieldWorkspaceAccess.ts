/**
 * TEMPORARY Phase 28 production wiring. A deployed Field PWA has no event-log
 * hand-off until Phases 29–30, so this intentionally starts from an empty log
 * and presents the no-access screen. Do not add static member data here.
 */

import type { WorkspaceAccessModule } from './workspaceAccessModule'
import { createE2EWorkspaceAccessModule } from './e2eWorkspaceAccess'
import { createDraftLocalWorkspaceAccess } from './localWorkspaceAccess'

export function createFieldWorkspaceAccessModule(): WorkspaceAccessModule {
  if (import.meta.env.DEV && import.meta.env.VITE_E2E_ACCESS === 'true') return createE2EWorkspaceAccessModule()
  return createDraftLocalWorkspaceAccess()
}
