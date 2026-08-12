/**
 * TEMPORARY Phase 28 vertical-slice projector and admission rules. The
 * complete Event Contract catalog, generated bindings, and durable local
 * projection store are Phase 29 work. Keep this limited to Workspace access;
 * do not add operational banding rules here until the full event core exists.
 */

import {
  canonicalizeEmail,
  createDraftEvent,
  createUuidV7,
  type DomainEvent,
  type ExternalIdentity,
  type MembershipRole,
} from '@birdnerd/events'

export type Workspace = {
  workspace_id: string
  name: string
}

export type Membership = {
  membership_id: string
  workspace_id: string
  email: string
  role: MembershipRole
  status: 'pending' | 'active'
  user_account_id?: string
}

export type UserAccount = {
  user_account_id: string
  identity: ExternalIdentity
}

export type WorkspaceProjection = {
  workspaces: ReadonlyMap<string, Workspace>
  memberships: ReadonlyMap<string, Membership>
  user_accounts: ReadonlyMap<string, UserAccount>
}

export type AdmissionDecision =
  | { accepted: true }
  | { accepted: false; reason: string }

export type AccessResolution =
  | { kind: 'active'; workspace: Workspace; membership: Membership; user_account: UserAccount }
  | { kind: 'pending'; membership: Membership }
  | { kind: 'no-access' }

export function projectWorkspaceEvents(events: readonly DomainEvent[]): WorkspaceProjection {
  const workspaces = new Map<string, Workspace>()
  const memberships = new Map<string, Membership>()
  const userAccounts = new Map<string, UserAccount>()

  for (const event of events) {
    if (event.event_type === 'workspace.created') {
      workspaces.set(event.payload.workspace_id, {
        workspace_id: event.payload.workspace_id,
        name: event.payload.name,
      })
    } else if (event.event_type === 'membership.preauthorized') {
      memberships.set(event.payload.membership_id, {
        membership_id: event.payload.membership_id,
        workspace_id: event.workspace_id,
        email: event.payload.email,
        role: event.payload.role,
        status: 'pending',
      })
    } else if (event.event_type === 'user-account.linked') {
      userAccounts.set(event.payload.user_account_id, {
        user_account_id: event.payload.user_account_id,
        identity: event.payload.identity,
      })
    } else if (event.event_type === 'membership.activated') {
      const membership = memberships.get(event.payload.membership_id)
      if (membership) {
        memberships.set(membership.membership_id, {
          ...membership,
          status: 'active',
          user_account_id: event.payload.user_account_id,
        })
      }
    }
  }

  return { workspaces, memberships, user_accounts: userAccounts }
}

export function admitWorkspaceEvent(candidate: DomainEvent, existingEvents: readonly DomainEvent[]): AdmissionDecision {
  const projection = projectWorkspaceEvents(existingEvents)
  const existingById = existingEvents.find(event => event.event_id === candidate.event_id)
  if (existingById) {
    return JSON.stringify(existingById) === JSON.stringify(candidate)
      ? { accepted: true }
      : deny('Event ID already exists with different content.')
  }

  if (candidate.event_type === 'workspace.created') {
    if (candidate.actor.kind !== 'restricted-provisioner') return deny('Only the restricted Provisioner can create a Workspace.')
    if (projection.workspaces.has(candidate.workspace_id)) return deny('Workspace already exists.')
    return { accepted: true }
  }

  if (!projection.workspaces.has(candidate.workspace_id)) return deny('Workspace does not exist.')

  if (candidate.event_type === 'membership.preauthorized') {
    if (candidate.actor.kind !== 'restricted-provisioner') return deny('Only the restricted Provisioner can pre-authorize a Membership in Phase 28.')
    if (projection.memberships.has(candidate.payload.membership_id)) return deny('Membership already exists.')
    const matchingEmail = [...projection.memberships.values()].find(membership => (
      membership.workspace_id === candidate.workspace_id && membership.email === candidate.payload.email
    ))
    if (matchingEmail) return deny('A Membership is already pre-authorized for that email in this Workspace.')
    return { accepted: true }
  }

  if (candidate.event_type === 'user-account.linked') {
    if (candidate.actor.kind !== 'external-identity') return deny('A signed-in external identity must link its User Account.')
    if (!sameIdentity(candidate.actor.identity, candidate.payload.identity)) return deny('A User Account link must be authored by the linked identity.')
    if (findUserAccountByIdentity(projection, candidate.payload.identity)) return deny('That external identity is already linked.')
    const pendingMembership = findPendingMembershipByEmail(projection, candidate.workspace_id, candidate.payload.identity.email)
    if (!pendingMembership) return deny('Only a pre-authorized identity may be linked.')
    return { accepted: true }
  }

  if (candidate.actor.kind !== 'external-identity') return deny('A signed-in external identity must activate its Membership.')
  const membership = projection.memberships.get(candidate.payload.membership_id)
  const account = projection.user_accounts.get(candidate.payload.user_account_id)
  if (!membership || membership.workspace_id !== candidate.workspace_id) return deny('Membership does not exist in the target Workspace.')
  if (!account || !sameIdentity(account.identity, candidate.actor.identity)) return deny('Membership activation must target the signed-in User Account.')
  if (membership.email !== candidate.actor.identity.email) return deny('Membership email does not match the signed-in identity.')
  if (membership.status === 'active' && membership.user_account_id !== account.user_account_id) return deny('Membership is already active for another User Account.')
  return { accepted: true }
}

export function resolveWorkspaceAccess(events: readonly DomainEvent[], identity: ExternalIdentity): AccessResolution {
  const projection = projectWorkspaceEvents(events)
  const account = findUserAccountByIdentity(projection, identity)
  if (account) {
    const membership = [...projection.memberships.values()].find(candidate => (
      candidate.user_account_id === account.user_account_id && candidate.status === 'active'
    ))
    if (membership) {
      const workspace = projection.workspaces.get(membership.workspace_id)
      if (workspace) return { kind: 'active', workspace, membership, user_account: account }
    }
  }

  const pendingMembership = [...projection.memberships.values()].find(candidate => (
    candidate.status === 'pending' && candidate.email === identity.email
  ))
  return pendingMembership ? { kind: 'pending', membership: pendingMembership } : { kind: 'no-access' }
}

export function decidePendingMembershipActivation(events: readonly DomainEvent[], identity: ExternalIdentity): DomainEvent[] {
  const canonicalIdentity = { ...identity, email: canonicalizeEmail(identity.email) }
  const resolution = resolveWorkspaceAccess(events, canonicalIdentity)
  if (resolution.kind !== 'pending') return []

  const commandId = createUuidV7()
  const existingAccount = findUserAccountByIdentity(projectWorkspaceEvents(events), canonicalIdentity)
  const userAccountId = existingAccount?.user_account_id ?? createUuidV7()
  const actor = { kind: 'external-identity' as const, identity: canonicalIdentity }
  const linkedAccountEvent = existingAccount
    ? []
    : [createDraftEvent({
        event_type: 'user-account.linked',
        workspace_id: resolution.membership.workspace_id,
        command_id: commandId,
        actor,
        payload: { user_account_id: userAccountId, identity: canonicalIdentity },
      })]

  return [
    ...linkedAccountEvent,
    createDraftEvent({
      event_type: 'membership.activated',
      workspace_id: resolution.membership.workspace_id,
      command_id: commandId,
      actor,
      payload: { membership_id: resolution.membership.membership_id, user_account_id: userAccountId },
    }),
  ]
}

function findPendingMembershipByEmail(projection: WorkspaceProjection, workspaceId: string, email: string): Membership | undefined {
  return [...projection.memberships.values()].find(membership => (
    membership.workspace_id === workspaceId && membership.status === 'pending' && membership.email === email
  ))
}

function findUserAccountByIdentity(projection: WorkspaceProjection, identity: ExternalIdentity): UserAccount | undefined {
  return [...projection.user_accounts.values()].find(account => sameIdentity(account.identity, identity))
}

function sameIdentity(left: ExternalIdentity, right: ExternalIdentity): boolean {
  return left.provider === right.provider && left.subject === right.subject
}

function deny(reason: string): AdmissionDecision {
  return { accepted: false, reason }
}
