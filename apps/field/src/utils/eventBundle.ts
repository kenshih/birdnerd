import type { PersistedEvent } from '@birdnerd/events'
import {
  EVENT_BUNDLE_FORMAT_VERSION,
  validateWorkspaceEventScope,
  workspaceEventContentSha256,
  type WorkspaceEventBundle,
} from './validation'

export { EVENT_BUNDLE_FORMAT_VERSION, parseWorkspaceEventBundle, type WorkspaceEventBundle } from './validation'

export async function createWorkspaceEventBundle(workspaceId: string, events: readonly PersistedEvent[]): Promise<WorkspaceEventBundle> {
  validateWorkspaceEventScope(workspaceId, events)
  // Bundles are portable immutable history, not a projection cache. Preserve
  // each supported raw Event representation; restore/replay interprets it.
  const copied = events.map(event => structuredClone(event))
  return {
    format: 'birdnerd-workspace-event-bundle',
    format_version: EVENT_BUNDLE_FORMAT_VERSION,
    manifest: {
      workspace_id: workspaceId,
      exported_at: new Date().toISOString(),
      event_count: copied.length,
      event_ids: copied.map(event => event.event_id),
      content_sha256: await workspaceEventContentSha256(copied),
    },
    events: copied,
  }
}

export function downloadWorkspaceEventBundle(bundle: WorkspaceEventBundle): void {
  const blob = new Blob([`${JSON.stringify(bundle, null, 2)}\n`], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `birdnerd-events_${bundle.manifest.workspace_id}_${bundle.manifest.exported_at.slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}
