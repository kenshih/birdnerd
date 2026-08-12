import { describe, expect, it } from 'vitest'
import { createDraftEvent } from '@birdnerd/events'
import { admitWorkspaceEvent, decidePendingMembershipActivation, projectWorkspaceEvents, resolveWorkspaceAccess } from './workspaceAccess.js'

const workspaceId = '018f8c7b-0000-7000-8000-000000000001'
const membershipId = '018f8c7b-0000-7000-8000-000000000002'

function provisionedEvents() {
  const created = createDraftEvent({
    event_type: 'workspace.created',
    workspace_id: workspaceId,
    command_id: '018f8c7b-0000-7000-8000-000000000003',
    actor: { kind: 'restricted-provisioner', provisioner_id: 'local-admin' },
    payload: { workspace_id: workspaceId, name: 'Cedar Creek' },
  })
  const preauthorized = createDraftEvent({
    event_type: 'membership.preauthorized',
    workspace_id: workspaceId,
    command_id: created.command_id,
    actor: { kind: 'restricted-provisioner', provisioner_id: 'local-admin' },
    payload: { membership_id: membershipId, email: 'bander@example.com', role: 'admin' },
  })
  return [created, preauthorized]
}

describe('Phase 28 Workspace access', () => {
  it('activates a matching pending Membership once and resolves active access', () => {
    const identity = { provider: 'google' as const, subject: 'google-123', email: 'bander@example.com' }
    const initial = provisionedEvents()
    const activation = decidePendingMembershipActivation(initial, identity)
    const events = [...initial, ...activation]

    expect(activation.map(event => event.event_type)).toEqual(['user-account.linked', 'membership.activated'])
    expect(resolveWorkspaceAccess(events, identity).kind).toBe('active')
    expect(decidePendingMembershipActivation(events, identity)).toEqual([])
    expect(projectWorkspaceEvents(events).workspace_memberships.get(membershipId)?.status).toBe('active')
  })

  it('denies self-service identity linkage without a pending Membership', () => {
    const candidate = createDraftEvent({
      event_type: 'user-account.linked',
      workspace_id: workspaceId,
      command_id: '018f8c7b-0000-7000-8000-000000000004',
      actor: { kind: 'external-identity', identity: { provider: 'google', subject: 'not-invited', email: 'other@example.com' } },
      payload: {
        user_account_id: '018f8c7b-0000-7000-8000-000000000005',
        identity: { provider: 'google', subject: 'not-invited', email: 'other@example.com' },
      },
    })

    expect(admitWorkspaceEvent(candidate, provisionedEvents())).toEqual({
      accepted: false,
      reason: 'Only a pre-authorized identity may be linked.',
    })
  })
})
