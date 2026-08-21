import type { QueryResult } from 'pg'
import { canonicalizeEmail, isUuidV7, upcastEvent, type DomainEvent, type WorkspaceMembershipRole } from '@birdnerd/events'
import { normalizeProvisioningMembers } from './provisioning.js'

export type ProvisioningMember = { email: string; role: WorkspaceMembershipRole }

export type BootstrapReceipt = {
  workspace_id: string
  command_id: string
  member_count: number
  events: readonly DomainEvent[]
}

export type MembershipReceipt = { workspace_id: string; membership_id: string; command_id: string; events: readonly DomainEvent[] }

export interface ProvisioningDatabase {
  query(text: string, values: readonly unknown[]): Promise<QueryResult<{ receipt: unknown }>>
}

/**
 * Deploy-only Adapter for the single non-exposed bootstrap operation. The
 * connected login must inherit only `birdnerd_provisioner`; this code never
 * receives raw Event Log or Membership table privileges.
 */
export async function bootstrapWorkspace(
  database: ProvisioningDatabase,
  input: { workspace_name: string; members: readonly ProvisioningMember[]; provisioner_id?: string },
): Promise<BootstrapReceipt> {
  const workspaceName = input.workspace_name.trim()
  if (!workspaceName) throw new Error('A Workspace name is required.')
  const members = normalizeProvisioningMembers(input.members)
  if (!members.some(member => member.role === 'admin')) throw new Error('At least one Admin is required.')
  const result = await database.query(
    'select birdnerd_private.bootstrap_workspace($1, $2::jsonb, $3) as receipt',
    [workspaceName, JSON.stringify(members), input.provisioner_id ?? 'phase-30-operator'],
  )
  return assertReceipt(result.rows[0]?.receipt)
}

/** Calls a narrow private lifecycle function; this Adapter never receives raw
 * Event Log or Membership table privileges. */
export async function changeMembership(database: ProvisioningDatabase, operation: 'invite' | 'set-role' | 'deactivate' | 'reactivate', input: { workspace_id: string; membership_id?: string; email?: string; role?: WorkspaceMembershipRole; provisioner_id?: string }): Promise<MembershipReceipt> {
  if (!isUuidV7(input.workspace_id)) throw new Error('A UUIDv7 Workspace ID is required.')
  if (operation === 'invite') {
    if (!input.email || !input.role) throw new Error('Invite requires email and role.')
    input = { ...input, email: canonicalizeEmail(input.email) }
  } else if (!input.membership_id || !isUuidV7(input.membership_id)) {
    throw new Error(`${operation} requires a UUIDv7 Membership ID.`)
  }
  if ((operation === 'invite' || operation === 'set-role') && input.role !== 'admin' && input.role !== 'contributor') throw new Error(`${operation} requires role admin or contributor.`)
  const functionName = `birdnerd_private.${operation.replace('-', '_')}_membership`
  const result = await database.query(`select ${functionName}($1::uuid, $2::uuid, $3, $4, $5) as receipt`, [input.workspace_id, input.membership_id ?? null, input.email ?? null, input.role ?? null, input.provisioner_id ?? 'phase-31-operator'])
  const value = result.rows[0]?.receipt
  if (!isRecord(value) || !isUuidV7(value.workspace_id) || !isUuidV7(value.membership_id) || !isUuidV7(value.command_id) || !Array.isArray(value.events)) throw new Error('Provisioner received an invalid membership audit receipt.')
  const events = value.events.map(upcastEvent)
  // Repeating an invite for an existing exact Membership is idempotent. The
  // private function returns the same target receipt with no second Event.
  if (events.length > 1 || events.some(event => event.workspace_id !== value.workspace_id)) throw new Error('Provisioner received an invalid membership audit receipt.')
  return { workspace_id: value.workspace_id, membership_id: value.membership_id, command_id: value.command_id, events }
}

function assertReceipt(value: unknown): BootstrapReceipt {
  if (!isRecord(value) || !isUuidV7(value.workspace_id) || !isUuidV7(value.command_id)
    || typeof value.member_count !== 'number' || !Number.isSafeInteger(value.member_count)
    || value.member_count < 1 || !Array.isArray(value.events)) {
    throw new Error('Provisioner received an invalid bootstrap audit receipt.')
  }
  const events = value.events.map(upcastEvent)
  if (events.length !== value.member_count + 1
    || events[0]?.event_type !== 'workspace.created'
    || events.slice(1).some(event => event.event_type !== 'membership.preauthorized')
    || events.some(event => event.workspace_id !== value.workspace_id || event.command_id !== value.command_id)) {
    throw new Error('Provisioner received an invalid bootstrap audit receipt.')
  }
  return { workspace_id: value.workspace_id, command_id: value.command_id, member_count: value.member_count, events }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
