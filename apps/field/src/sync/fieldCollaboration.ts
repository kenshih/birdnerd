import { createSyncCoordinator, type EventExchange, type SyncCoordinator } from '@birdnerd/sync-state'
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
  const exchange = supabase ? createSupabaseEventExchange(supabase) : undefined
  collaboration = { store, exchange, sync: exchange ? createSyncCoordinator(store, exchange) : undefined }
  return collaboration
}
