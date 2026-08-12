import { describe, expect, it } from 'vitest'
import { decodeDraftEventLog, encodeDraftEventLog } from '@birdnerd/events'
import { LocalEventLog } from '@birdnerd/sync-state'
import { admitWorkspaceEvent, decidePendingMembershipActivation, resolveWorkspaceAccess } from '@birdnerd/banding'
import { parsePendingMember, provisionWorkspace } from './provisioning.js'

describe('Provisioner vertical slice', () => {
  it('emits, admits, projects, and activates the initial Admin Membership idempotently', () => {
    const provisioned = provisionWorkspace({
      workspace_name: 'Cedar Creek',
      admin_email: 'Admin@Example.com',
      pending_members: [parsePendingMember('contributor@example.com:contributor')],
    })
    const handoff = decodeDraftEventLog(encodeDraftEventLog(provisioned))
    const log = new LocalEventLog(handoff, admitWorkspaceEvent)
    const identity = { provider: 'google' as const, subject: 'google-admin', email: 'admin@example.com' }

    const activation = decidePendingMembershipActivation(log.snapshot(), identity)
    expect(log.appendAll(activation).map(result => result.kind)).toEqual(['accepted', 'accepted'])
    expect(resolveWorkspaceAccess(log.snapshot(), identity)).toMatchObject({
      kind: 'active',
      membership: { role: 'admin', status: 'active', email: 'admin@example.com' },
      workspace: { name: 'Cedar Creek' },
    })
    expect(decidePendingMembershipActivation(log.snapshot(), identity)).toEqual([])
  })
})
