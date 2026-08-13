import { isUuidV7, parseRfc3339Milliseconds, upcastEvent, type DomainEvent } from '@birdnerd/events'

export const EVENT_BUNDLE_FORMAT_VERSION = 1

export type WorkspaceEventBundle = {
  format: 'birdnerd-workspace-event-bundle'
  format_version: typeof EVENT_BUNDLE_FORMAT_VERSION
  manifest: {
    workspace_id: string
    exported_at: string
    event_count: number
    event_ids: string[]
    content_sha256: string
  }
  events: DomainEvent[]
}

export async function createWorkspaceEventBundle(workspaceId: string, events: readonly DomainEvent[]): Promise<WorkspaceEventBundle> {
  validateWorkspaceScope(workspaceId, events)
  const copied = events.map(event => upcastEvent(structuredClone(event)))
  return {
    format: 'birdnerd-workspace-event-bundle',
    format_version: EVENT_BUNDLE_FORMAT_VERSION,
    manifest: {
      workspace_id: workspaceId,
      exported_at: new Date().toISOString(),
      event_count: copied.length,
      event_ids: copied.map(event => event.event_id),
      content_sha256: await sha256(JSON.stringify(copied)),
    },
    events: copied,
  }
}

/** Validate the full container and every Event before a restore may write IndexedDB. */
export async function parseWorkspaceEventBundle(serialized: string): Promise<WorkspaceEventBundle> {
  const value: unknown = JSON.parse(serialized)
  if (!isRecord(value) || value.format !== 'birdnerd-workspace-event-bundle' || value.format_version !== EVENT_BUNDLE_FORMAT_VERSION
    || !isRecord(value.manifest) || !Array.isArray(value.events)) throw new Error('Unsupported or malformed Workspace Event Bundle.')
  const workspaceId = value.manifest.workspace_id
  if (typeof workspaceId !== 'string' || !isUuidV7(workspaceId)) throw new Error('Bundle manifest Workspace ID is invalid.')
  if (typeof value.manifest.content_sha256 !== 'string' || value.manifest.content_sha256 !== await sha256(JSON.stringify(value.events))) {
    throw new Error('Bundle Event Log integrity check failed.')
  }
  const events = value.events.map(upcastEvent)
  validateWorkspaceScope(workspaceId, events)
  const ids = events.map(event => event.event_id)
  if (value.manifest.event_count !== events.length || JSON.stringify(value.manifest.event_ids) !== JSON.stringify(ids)) {
    throw new Error('Bundle manifest does not match its Event Log.')
  }
  if (typeof value.manifest.exported_at !== 'string') throw new Error('Bundle export timestamp is invalid.')
  parseRfc3339Milliseconds(value.manifest.exported_at)
  return { ...value, events } as unknown as WorkspaceEventBundle
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

function validateWorkspaceScope(workspaceId: string, events: readonly DomainEvent[]): void {
  if (!isUuidV7(workspaceId)) throw new Error('Workspace ID is invalid.')
  const ids = new Set<string>()
  for (const event of events) {
    if (event.workspace_id !== workspaceId) throw new Error('Bundle contains an Event from another Workspace.')
    if (ids.has(event.event_id)) throw new Error('Bundle contains a duplicate Event ID.')
    ids.add(event.event_id)
  }
}

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
