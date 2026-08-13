/** Durable Field adapter for Workspace access, backed by the local Event Log. */
import { decidePendingMembershipActivation, resolveWorkspaceAccess } from '@birdnerd/banding'
import type { ExternalIdentity } from '../auth/authModule'
import type { WorkspaceAccessModule, WorkspaceAccessResult } from './workspaceAccessModule'
import { toEventIdentity, toWorkspaceAccessResult } from './workspaceAccessMapping'
import { WorkspaceEventStore } from './workspaceEventStore'

/**
 * Resolve BirdNerd authorization from durable local Events. Pending-membership
 * activation is persisted before the active result is returned, so reopening
 * Field cannot repeat a successful activation as a new event group.
 */
export function createDurableWorkspaceAccess(store = new WorkspaceEventStore()): WorkspaceAccessModule {
  // WorkspaceAccessGate can ask once from its auth subscription and again
  // while reading current state. Keep the read-decide-append sequence atomic
  // within this local adapter so a duplicate activation observes the first.
  let resolutionQueue = Promise.resolve()

  return {
    resolve(identity: ExternalIdentity): Promise<WorkspaceAccessResult> {
      const resolution = resolutionQueue.then(() => resolveOnce(store, identity))
      // Let a later resolution continue even if an earlier storage failure was
      // surfaced to its caller.
      resolutionQueue = resolution.then(() => undefined, () => undefined)
      return resolution
    },
  }
}

async function resolveOnce(store: WorkspaceEventStore, identity: ExternalIdentity): Promise<WorkspaceAccessResult> {
  const eventIdentity = toEventIdentity(identity)
  if (!eventIdentity) return { kind: 'no-access' }

  const activation = decidePendingMembershipActivation(await store.snapshot(), eventIdentity)
  const results = await store.appendAll(activation)
  const rejected = results.find(result => result.kind === 'rejected')
  if (rejected?.kind === 'rejected') throw new Error(`Workspace access activation was rejected: ${rejected.reason}`)

  return toWorkspaceAccessResult(resolveWorkspaceAccess(await store.snapshot(), eventIdentity))
}
