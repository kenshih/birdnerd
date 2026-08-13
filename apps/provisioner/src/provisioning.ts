/**
 * Local-only Workspace bootstrap command. It emits canonical Events and sends
 * them through ordinary admission, but does not write Field storage or act as
 * an Event Bundle or shared-service authority.
 */

import { admitWorkspaceEvent } from '@birdnerd/banding'
import { canonicalizeEmail, createEvent, createUuidV7, type DomainEvent, type WorkspaceMembershipRole } from '@birdnerd/events'
import { EventLog } from '@birdnerd/sync-state'

export type PendingMemberInput = {
  email: string
  role: WorkspaceMembershipRole
}

export type ProvisionWorkspaceInput = {
  workspace_name: string
  admin_email: string
  pending_members?: readonly PendingMemberInput[]
  provisioner_id?: string
}

export function provisionWorkspace(input: ProvisionWorkspaceInput): readonly DomainEvent[] {
  const workspaceName = input.workspace_name.trim()
  if (!workspaceName) throw new Error('A Workspace name is required.')

  const members = normalizeMembers([
    { email: input.admin_email, role: 'admin' },
    ...(input.pending_members ?? []),
  ])
  const workspaceId = createUuidV7()
  const commandId = createUuidV7()
  const actor = { kind: 'restricted-provisioner' as const, provisioner_id: input.provisioner_id ?? 'local-admin' }
  const events: DomainEvent[] = [createEvent({
    event_type: 'workspace.created',
    workspace_id: workspaceId,
    command_id: commandId,
    actor,
    payload: { workspace_id: workspaceId, name: workspaceName },
  })]

  for (const member of members) {
    events.push(createEvent({
      event_type: 'membership.preauthorized',
      workspace_id: workspaceId,
      command_id: commandId,
      actor,
      payload: {
        membership_id: createUuidV7(),
        email: member.email,
        role: member.role,
      },
    }))
  }

  const log = new EventLog([], admitWorkspaceEvent)
  for (const result of log.appendAll(events)) {
    if (result.kind === 'rejected') throw new Error(`Provisioning event rejected: ${result.reason}`)
  }
  return log.snapshot()
}

export function parsePendingMember(value: string): PendingMemberInput {
  const separator = value.lastIndexOf(':')
  if (separator <= 0) throw new Error('A pending member must use email:admin or email:contributor.')
  const email = canonicalizeEmail(value.slice(0, separator))
  const role = value.slice(separator + 1) as WorkspaceMembershipRole
  if (role !== 'admin' && role !== 'contributor') throw new Error('Membership role must be admin or contributor.')
  return { email, role }
}

function normalizeMembers(members: readonly PendingMemberInput[]): PendingMemberInput[] {
  const seen = new Set<string>()
  return members.map(member => ({ ...member, email: canonicalizeEmail(member.email) })).map(member => {
    if (seen.has(member.email)) throw new Error(`A pending Membership already exists for ${member.email}.`)
    seen.add(member.email)
    return member
  })
}
