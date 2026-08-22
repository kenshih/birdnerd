import { describe, expect, it } from 'vitest'
import { createEvent } from '@birdnerd/events'
import { createWorkspaceEventBundle, parseWorkspaceEventBundle } from './eventBundle'

const workspaceId = '018f8c7b-0000-7000-8000-000000000001'
const event = createEvent({
  event_type: 'session.created',
  workspace_id: workspaceId,
  command_id: '018f8c7b-0000-7000-8000-000000000002',
  actor: { kind: 'user-account', user_account_id: '018f8c7b-0000-7000-8000-000000000003' },
  payload: { session_id: '018f8c7b-0000-7000-8000-000000000004', fields: {} },
})

describe('Workspace Event Bundle', () => {
  it('round-trips a versioned Workspace-scoped Event Log with integrity evidence', async () => {
    const bundle = await createWorkspaceEventBundle(workspaceId, [event])
    await expect(parseWorkspaceEventBundle(JSON.stringify(bundle))).resolves.toEqual(bundle)
  })

  it('rejects corruption, duplicate IDs, and cross-Workspace Events', async () => {
    const bundle = await createWorkspaceEventBundle(workspaceId, [event])
    const corrupt = structuredClone(bundle)
    corrupt.events[0].payload = { session_id: '018f8c7b-0000-7000-8000-000000000005' }
    await expect(parseWorkspaceEventBundle(JSON.stringify(corrupt))).rejects.toThrow('integrity')
    await expect(createWorkspaceEventBundle(workspaceId, [event, event])).rejects.toThrow('duplicate')
    await expect(createWorkspaceEventBundle('018f8c7b-0000-7000-8000-000000000006', [event])).rejects.toThrow('another Workspace')
  })

  it('rejects malformed and internally consistent hostile restore Bundles', async () => {
    await expect(parseWorkspaceEventBundle('{}')).rejects.toThrow('malformed')

    const duplicate = await createWorkspaceEventBundle(workspaceId, [event])
    duplicate.events = [event, event]
    duplicate.manifest.event_count = 2
    duplicate.manifest.event_ids = [event.event_id, event.event_id]
    duplicate.manifest.content_sha256 = await digest(JSON.stringify(duplicate.events))
    await expect(parseWorkspaceEventBundle(JSON.stringify(duplicate))).rejects.toThrow('duplicate')

    const other = createEvent({
      ...event,
      event_id: '018f8c7b-0000-7000-8000-000000000006',
      workspace_id: '018f8c7b-0000-7000-8000-000000000007',
    })
    const crossed = await createWorkspaceEventBundle(workspaceId, [event])
    crossed.events = [other]
    crossed.manifest.event_ids = [other.event_id]
    crossed.manifest.content_sha256 = await digest(JSON.stringify(crossed.events))
    await expect(parseWorkspaceEventBundle(JSON.stringify(crossed))).rejects.toThrow('another Workspace')
  })

  it('validates a historical v1 Event without rewriting it and rejects v1 pilot Events', async () => {
    const historical = createEvent({
      event_type: 'workspace.created',
      workspace_id: workspaceId,
      command_id: '018f8c7b-0000-7000-8000-000000000002',
      actor: { kind: 'restricted-provisioner', provisioner_id: 'test' },
      payload: { workspace_id: workspaceId, name: 'Cedar Creek' },
    })
    const { event_envelope_version: _version, hlc: _hlc, ...legacy } = historical
    const currentBundle = await createWorkspaceEventBundle(workspaceId, [historical])
    const legacyBundle = {
      ...currentBundle,
      manifest: {
        ...currentBundle.manifest,
        content_sha256: await digest(JSON.stringify([legacy])),
      },
      events: [legacy],
    }
    const parsed = await parseWorkspaceEventBundle(JSON.stringify(legacyBundle))
    expect(parsed.events[0]).not.toHaveProperty('event_envelope_version')
    expect(parsed.events[0]).not.toHaveProperty('hlc')

    const { event_envelope_version: _pilotVersion, hlc: _pilotHlc, ...legacyPilot } = event
    const legacyPilotBundle = {
      ...currentBundle,
      manifest: {
        ...currentBundle.manifest,
        event_ids: [legacyPilot.event_id],
        content_sha256: await digest(JSON.stringify([legacyPilot])),
      },
      events: [legacyPilot],
    }
    await expect(parseWorkspaceEventBundle(JSON.stringify(legacyPilotBundle))).rejects.toThrow('introduced with Event envelope version 2')
  })
})

async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
