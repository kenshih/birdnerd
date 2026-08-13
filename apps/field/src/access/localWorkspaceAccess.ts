/** In-memory Workspace access adapter for focused tests and the Playwright fixture. */

import { admitWorkspaceEvent, decidePendingMembershipActivation, resolveWorkspaceAccess } from '@birdnerd/banding'
import type { DomainEvent } from '@birdnerd/events'
import { EventLog } from '@birdnerd/sync-state'
import type { ExternalIdentity } from '../auth/authModule'
import type { WorkspaceAccessModule, WorkspaceAccessResult } from './workspaceAccessModule'
import { toEventIdentity, toWorkspaceAccessResult } from './workspaceAccessMapping'

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

      return toWorkspaceAccessResult(resolveWorkspaceAccess(log.snapshot(), eventIdentity))
    },
  }
}
