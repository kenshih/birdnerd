import type { SyncStatus } from '@birdnerd/sync-state'

/** Stable user-facing sync copy shared by the pilot and operational Field surfaces. */
export function formatSyncStatus(status: SyncStatus): string {
  if (status.kind === 'syncing') return 'Syncing…'
  if (status.kind === 'offline') return `Offline — changes stay on this device (${status.message})`
  if (status.kind === 'deferred') return `Waiting to retry ${eventCount(status.deferred)} at ${formatSyncTimestamp(status.retry_at)} (${status.message})`
  if (status.kind === 'attention') return `${eventCount(status.rejected)} need attention`
  return status.last_synced_at ? `Synced ${formatSyncTimestamp(status.last_synced_at)}` : 'Ready to sync'
}

function eventCount(count: number): string {
  return `${count} Event${count === 1 ? '' : 's'}`
}

function formatSyncTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString().replace('.000Z', 'Z')
}
