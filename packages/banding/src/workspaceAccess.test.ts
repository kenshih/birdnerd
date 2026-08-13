import { describe, expect, it } from 'vitest'
import { createEvent } from '@birdnerd/events'
import { admitWorkspaceEvent, decidePendingMembershipActivation, projectWorkspaceEvents, resolveWorkspaceAccess } from './workspaceAccess.js'

const workspaceId = '018f8c7b-0000-7000-8000-000000000001'
const membershipId = '018f8c7b-0000-7000-8000-000000000002'
const otherWorkspaceId = '018f8c7b-0000-7000-8000-000000000006'

function provisionedEvents() {
  const created = createEvent({
    event_type: 'workspace.created',
    workspace_id: workspaceId,
    command_id: '018f8c7b-0000-7000-8000-000000000003',
    actor: { kind: 'restricted-provisioner', provisioner_id: 'local-admin' },
    payload: { workspace_id: workspaceId, name: 'Cedar Creek' },
  })
  const preauthorized = createEvent({
    event_type: 'membership.preauthorized',
    workspace_id: workspaceId,
    command_id: created.command_id,
    actor: { kind: 'restricted-provisioner', provisioner_id: 'local-admin' },
    payload: { membership_id: membershipId, email: 'bander@example.com', role: 'admin' },
  })
  return [created, preauthorized]
}

describe('Workspace access', () => {
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

  it('accepts independently appendable identity events without granting self-service access', () => {
    const identity = { provider: 'google' as const, subject: 'not-invited', email: 'other@example.com' }
    const candidate = createEvent({
      event_type: 'user-account.linked',
      workspace_id: workspaceId,
      command_id: '018f8c7b-0000-7000-8000-000000000004',
      actor: { kind: 'external-identity', identity },
      payload: {
        user_account_id: '018f8c7b-0000-7000-8000-000000000005',
        identity,
      },
    })

    expect(admitWorkspaceEvent(candidate, provisionedEvents())).toEqual({ accepted: true })
    expect(resolveWorkspaceAccess([...provisionedEvents(), candidate], identity)).toEqual({ kind: 'no-access' })
  })

  it('replays provisioned and activation event groups in any arrival order', () => {
    const identity = { provider: 'google' as const, subject: 'google-123', email: 'bander@example.com' }
    const provisioned = provisionedEvents()
    const activation = decidePendingMembershipActivation([...provisioned].reverse(), identity)
    const events = [...provisioned, ...activation].reverse()

    expect(resolveWorkspaceAccess(events, identity)).toMatchObject({
      kind: 'active',
      workspace: { name: 'Cedar Creek' },
      workspace_membership: { status: 'active', role: 'admin' },
    })
  })

  it('rejects and does not project a Membership activation in another Workspace', () => {
    const identity = { provider: 'google' as const, subject: 'google-123', email: 'bander@example.com' }
    const initial = provisionedEvents()
    const [linkedAccount, activation] = decidePendingMembershipActivation(initial, identity)
    const wrongWorkspaceActivation = { ...activation, workspace_id: otherWorkspaceId }

    expect(admitWorkspaceEvent(wrongWorkspaceActivation, [...initial, linkedAccount])).toEqual({
      accepted: false,
      reason: 'A Membership activation must target the Membership Workspace.',
    })
    expect(resolveWorkspaceAccess([...initial, linkedAccount, wrongWorkspaceActivation], identity)).toMatchObject({
      kind: 'pending', workspace_membership: { membership_id: membershipId },
    })
  })
})
