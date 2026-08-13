import { createSyncCoordinator, InMemoryEventExchange, type EventExchange, type SyncCoordinator } from '@birdnerd/sync-state'
import { WorkspaceEventStore } from '../access/workspaceEventStore'
import { getFieldSupabaseClient } from '../supabase/fieldSupabase'
import { createSupabaseEventExchange } from './supabaseEventExchange'

export type FieldCollaboration = {
  store: WorkspaceEventStore
  exchange?: EventExchange
  sync?: SyncCoordinator
}

let collaboration: FieldCollaboration | undefined

/** Shared Field wiring so access, operational commands, and sync use one replica and session. */
export function getFieldCollaboration(): FieldCollaboration {
  if (collaboration) return collaboration
  const store = new WorkspaceEventStore()
  const supabase = getFieldSupabaseClient()
  const exchange = import.meta.env.DEV && import.meta.env.VITE_E2E_ACCESS === 'true'
    ? createE2EEventExchange()
    : supabase
      ? createSupabaseEventExchange(supabase)
      : undefined
  collaboration = { store, exchange, sync: exchange ? createSyncCoordinator(store, exchange) : undefined }
  return collaboration
}

/** Browser-aware wrapper keeps the deterministic E2E server honest offline. */
function createE2EEventExchange(): EventExchange {
  const delegate = new InMemoryEventExchange()
  const online = () => {
    if (!navigator.onLine) throw new Error('The deterministic Event exchange is offline.')
  }
  return {
    async claimInitialAccess() {
      online()
      return delegate.claimInitialAccess()
    },
    async push(events) {
      online()
      return delegate.push(events)
    },
    async pull(workspaceId, afterServerSequence, limit) {
      online()
      return delegate.pull(workspaceId, afterServerSequence, limit)
    },
  }
}
