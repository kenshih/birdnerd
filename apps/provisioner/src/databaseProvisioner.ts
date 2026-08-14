import type { QueryResult } from 'pg'
import { isUuidV7, upcastEvent, type DomainEvent, type WorkspaceMembershipRole } from '@birdnerd/events'
import { normalizeProvisioningMembers } from './provisioning.js'

export type ProvisioningMember = { email: string; role: WorkspaceMembershipRole }

export type BootstrapReceipt = {
  workspace_id: string
  command_id: string
  member_count: number
  events: readonly DomainEvent[]
}

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
