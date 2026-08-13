/**
 * Workspace-access commands, admission, and projection reducer. These pure
 * rules depend only on portable Event Contracts so a Field IndexedDB cache can
 * be discarded and rebuilt without turning storage or UI into domain logic.
 */

import {
  canonicalizeEmail,
  createEvent,
  createUuidV7,
  type DomainEvent,
  type ExternalIdentity,
  type UuidV7,
  type WorkspaceMembershipRole,
} from '@birdnerd/events'

export type Workspace = {
  workspace_id: UuidV7
  name: string
}

/** A person's BirdNerd access relationship to one Workspace. */
export type WorkspaceMembership = {
  membership_id: UuidV7
  workspace_id: UuidV7
  email: string
  role: WorkspaceMembershipRole
  status: 'pending' | 'active'
  user_account_id?: UuidV7
}

/**
 * BirdNerd's own account for an authenticated person. It links an external
 * identity such as Google to BirdNerd access; it is neither the external
 * identity itself nor the domain Person record that Phase 29 later connects.
 */
export type UserAccount = {
  user_account_id: UuidV7
  identity: ExternalIdentity
}

/**
 * The rebuildable current view made by replaying Workspace and access Events.
 * It is never a durable source of truth or authoritative server-side state.
 */
export type WorkspaceProjection = {
  workspaces: ReadonlyMap<UuidV7, Workspace>
  workspace_memberships: ReadonlyMap<UuidV7, WorkspaceMembership>
  user_accounts: ReadonlyMap<UuidV7, UserAccount>
}

/** JSON-safe cache shape for a WorkspaceProjection. It is always rebuildable from the Event Log. */
export type WorkspaceProjectionSnapshot = {
  projection_version: 1
  workspaces: Workspace[]
  workspace_memberships: WorkspaceMembership[]
  user_accounts: UserAccount[]
}

export type AdmissionDecision =
  | { accepted: true }
  | { accepted: false; reason: string }

export type AccessResolution =
  | { kind: 'active'; workspace: Workspace; workspace_membership: WorkspaceMembership; user_account: UserAccount }
  | { kind: 'pending'; workspace_membership: WorkspaceMembership }
  | { kind: 'no-access' }

/**
 * Replay the current Workspace-access event set into the current Workspace access
 * view. The Event Log remains authoritative; callers may discard and rebuild
 * this projection at any time.
 */
export function projectWorkspaceEvents(events: readonly DomainEvent[]): WorkspaceProjection {
  const workspaces = new Map<UuidV7, Workspace>()
  const workspaceMemberships = new Map<UuidV7, WorkspaceMembership>()
  const userAccounts = new Map<UuidV7, UserAccount>()

  // Build the facts that can stand alone first, so their order in an Event Log
  // does not decide whether a later activation can be projected.
  for (const event of events) {
    if (event.event_type === 'workspace.created') {
      workspaces.set(event.payload.workspace_id, {
        workspace_id: event.payload.workspace_id,
        name: event.payload.name,
      })
    } else if (event.event_type === 'membership.preauthorized') {
      workspaceMemberships.set(event.payload.membership_id, {
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
    }
  }

  // Activation depends on facts that may arrive before or after it. A second
  // deterministic pass makes projection replay-order independent while still
  // refusing to activate a Membership whose identity and email do not match.
  for (const event of events) {
    if (event.event_type !== 'membership.activated') continue
    const workspaceMembership = workspaceMemberships.get(event.payload.membership_id)
    const account = userAccounts.get(event.payload.user_account_id)
    if (!workspaceMembership || !account || event.actor.kind !== 'external-identity') continue
    if (event.workspace_id !== workspaceMembership.workspace_id) continue
    if (!sameIdentity(account.identity, event.actor.identity)) continue
    if (workspaceMembership.email !== event.actor.identity.email) continue
    if (workspaceMembership.status === 'active' && workspaceMembership.user_account_id !== account.user_account_id) continue
    workspaceMemberships.set(workspaceMembership.membership_id, {
      ...workspaceMembership,
      status: 'active',
      user_account_id: account.user_account_id,
    })
  }

  return { workspaces, workspace_memberships: workspaceMemberships, user_accounts: userAccounts }
}

/** Convert a derived projection to a JSON-safe cache; callers must not treat it as authoritative. */
export function snapshotWorkspaceProjection(projection: WorkspaceProjection): WorkspaceProjectionSnapshot {
  return {
    projection_version: 1,
    workspaces: [...projection.workspaces.values()],
    workspace_memberships: [...projection.workspace_memberships.values()],
    user_accounts: [...projection.user_accounts.values()],
  }
}

/**
 * Apply the local admission rules before an event can enter the
 * Event Log. Rules check structure, authority, and immutable-ID conflicts but
 * deliberately do not require another event to have arrived first: command
 * groups must remain independently appendable and replayable in any order.
 * Authenticated Supabase Event Admission replaces these local rules in Phase 30.
 */
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

  if (candidate.event_type === 'membership.preauthorized') {
    if (candidate.actor.kind !== 'restricted-provisioner') return deny('Only the restricted Provisioner can pre-authorize a Membership locally.')
    if (projection.workspace_memberships.has(candidate.payload.membership_id)) return deny('Workspace Membership already exists.')
    const matchingEmail = [...projection.workspace_memberships.values()].find(workspaceMembership => (
      workspaceMembership.workspace_id === candidate.workspace_id && workspaceMembership.email === candidate.payload.email
    ))
    if (matchingEmail) return deny('A Workspace Membership is already pre-authorized for that email in this Workspace.')
    return { accepted: true }
  }

  if (candidate.event_type === 'user-account.linked') {
    if (candidate.actor.kind !== 'external-identity') return deny('A signed-in external identity must link its User Account.')
    if (!sameIdentity(candidate.actor.identity, candidate.payload.identity)) return deny('A User Account link must be authored by the linked identity.')
    if (findUserAccountByIdentity(projection, candidate.payload.identity)) return deny('That external identity is already linked.')
    return { accepted: true }
  }

  if (candidate.actor.kind !== 'external-identity') return deny('A signed-in external identity must activate its Membership.')
  const workspaceMembership = projection.workspace_memberships.get(candidate.payload.membership_id)
  if (workspaceMembership && candidate.workspace_id !== workspaceMembership.workspace_id) {
    return deny('A Membership activation must target the Membership Workspace.')
  }
  return { accepted: true }
}

/** Resolve an external identity to current Workspace access without changing the Event Log. */
export function resolveWorkspaceAccess(events: readonly DomainEvent[], identity: ExternalIdentity): AccessResolution {
  const projection = projectWorkspaceEvents(events)
  const account = findUserAccountByIdentity(projection, identity)
  if (account) {
    const workspaceMembership = [...projection.workspace_memberships.values()].find(candidate => (
      candidate.user_account_id === account.user_account_id && candidate.status === 'active'
    ))
    if (workspaceMembership) {
      const workspace = projection.workspaces.get(workspaceMembership.workspace_id)
      if (workspace) return { kind: 'active', workspace, workspace_membership: workspaceMembership, user_account: account }
    }
  }

  const pendingMembership = [...projection.workspace_memberships.values()].find(candidate => (
    candidate.status === 'pending' && candidate.email === identity.email
  ))
  return pendingMembership ? { kind: 'pending', workspace_membership: pendingMembership } : { kind: 'no-access' }
}

/**
 * Decide, but do not append, the events needed to link a pre-authorized Google
 * identity and activate its pending Workspace Membership. Repeating this after
 * activation returns no events, making the operation idempotent.
 */
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
    : [createEvent({
        event_type: 'user-account.linked',
        workspace_id: resolution.workspace_membership.workspace_id,
        command_id: commandId,
        actor,
        payload: { user_account_id: userAccountId, identity: canonicalIdentity },
      })]

  return [
    ...linkedAccountEvent,
    createEvent({
      event_type: 'membership.activated',
      workspace_id: resolution.workspace_membership.workspace_id,
      command_id: commandId,
      actor,
      payload: { membership_id: resolution.workspace_membership.membership_id, user_account_id: userAccountId },
    }),
  ]
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
