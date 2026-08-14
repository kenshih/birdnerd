/** Production wiring for Field's clean durable local Event Log. */

import type { WorkspaceAccessModule } from './workspaceAccessModule'
import { createE2EWorkspaceAccessModule } from './e2eWorkspaceAccess'
import { createSupabaseWorkspaceAccess } from './supabaseWorkspaceAccess'
import { getFieldCollaboration } from '../sync/fieldCollaboration'

export function createFieldWorkspaceAccessModule(): WorkspaceAccessModule {
  // Playwright sets this only for its Vite dev server; never add it to .env.local.
  if (import.meta.env.DEV && import.meta.env.VITE_E2E_ACCESS === 'true') return createE2EWorkspaceAccessModule()
  const { exchange, store } = getFieldCollaboration()
  if (!exchange) return { async resolve() { return { kind: 'no-access' } } }
  return createSupabaseWorkspaceAccess(exchange, store)
}
