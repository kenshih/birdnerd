import { resolveWorkspaceAccess } from '@birdnerd/banding'
import type { EventExchange } from '@birdnerd/sync-state'
import type { ExternalIdentity } from '../auth/authModule'
import type { WorkspaceAccessModule, WorkspaceAccessResult } from './workspaceAccessModule'
import { toEventIdentity, toWorkspaceAccessResult } from './workspaceAccessMapping'
import { WorkspaceEventStore } from './workspaceEventStore'

/**
 * Server-claimed Workspace access. Existing durable active access works
 * offline; first access must be claimed and persisted before it is returned.
 */
export function createSupabaseWorkspaceAccess(exchange: EventExchange, store: WorkspaceEventStore): WorkspaceAccessModule {
  let resolutionQueue = Promise.resolve()
  return {
    resolve(identity: ExternalIdentity): Promise<WorkspaceAccessResult> {
      const result = resolutionQueue.then(() => resolveOnce(identity))
      resolutionQueue = result.then(() => undefined, () => undefined)
      return result
    },
  }

  async function resolveOnce(identity: ExternalIdentity): Promise<WorkspaceAccessResult> {
    const eventIdentity = toEventIdentity(identity)
    if (!eventIdentity) return { kind: 'no-access' }
    const local = toWorkspaceAccessResult(resolveWorkspaceAccess(await store.snapshot(), eventIdentity))
    if (local.kind === 'active') {
      store.activateWorkspace(local.access.workspace_id)
      return local
    }

    const claim = await exchange.claimInitialAccess()
    if (claim.kind === 'no-access' || claim.events.length === 0) return { kind: 'no-access' }
    const workspaceId = claim.events[0].event.workspace_id
    if (claim.events.some(item => item.event.workspace_id !== workspaceId)) throw new Error('Initial-access claim crossed Workspace scope.')
    store.activateWorkspace(workspaceId)
    await store.commit({ receipts: [], pulled: claim.events, cursor: claim.events[claim.events.length - 1]?.server_sequence ?? 0 })
    const resolution = toWorkspaceAccessResult(resolveWorkspaceAccess(await store.snapshot(), eventIdentity))
    return resolution
  }
}
