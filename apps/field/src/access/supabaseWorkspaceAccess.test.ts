import { beforeEach, describe, expect, it } from 'vitest'
import { createEvent } from '@birdnerd/events'
import { InMemoryEventExchange } from '@birdnerd/sync-state'
import { resetWorkspaceEventStore, WorkspaceEventStore } from './workspaceEventStore'
import { createSupabaseWorkspaceAccess } from './supabaseWorkspaceAccess'

const workspaceId = '018f8c7b-0000-7000-8000-000000000001'
const membershipId = '018f8c7b-0000-7000-8000-000000000002'
const userId = '018f8c7b-0000-7000-8000-000000000003'
const identity = { provider: 'google' as const, subject: 'google-123', email: 'bander@example.com' }

beforeEach(async () => {
  resetWorkspaceEventStore()
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('birdnerd-event-core')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
})

describe('Supabase Workspace access', () => {
  it('persists canonical claim Events before returning active access and reopens offline', async () => {
    const events = accessEvents()
    const exchange = new InMemoryEventExchange()
    exchange.setInitialAccess({ kind: 'active', events: events.map((event, index) => ({ event, server_sequence: index + 1 })) })
    const store = new WorkspaceEventStore()
    await expect(createSupabaseWorkspaceAccess(exchange, store).resolve(identity)).resolves.toMatchObject({
      kind: 'active', access: { workspace_id: workspaceId, user_account_id: userId },
    })

    resetWorkspaceEventStore()
    const offlineExchange = new InMemoryEventExchange()
    offlineExchange.claimInitialAccess = async () => { throw new Error('offline') }
    await expect(createSupabaseWorkspaceAccess(offlineExchange, new WorkspaceEventStore()).resolve(identity)).resolves.toMatchObject({ kind: 'active' })
  })

  it('does not grant access for an empty server claim', async () => {
    await expect(createSupabaseWorkspaceAccess(new InMemoryEventExchange(), new WorkspaceEventStore()).resolve(identity)).resolves.toEqual({ kind: 'no-access' })
  })
})

function accessEvents() {
  const command = '018f8c7b-0000-7000-8000-000000000004'
  return [
    createEvent({ event_type: 'workspace.created', workspace_id: workspaceId, command_id: command, actor: { kind: 'restricted-provisioner', provisioner_id: 'test' }, payload: { workspace_id: workspaceId, name: 'Cedar Creek' } }),
    createEvent({ event_type: 'membership.preauthorized', workspace_id: workspaceId, command_id: command, actor: { kind: 'restricted-provisioner', provisioner_id: 'test' }, payload: { membership_id: membershipId, email: identity.email, role: 'admin' } }),
    createEvent({ event_type: 'user-account.linked', workspace_id: workspaceId, command_id: command, actor: { kind: 'external-identity', identity }, payload: { user_account_id: userId, identity } }),
    createEvent({ event_type: 'membership.activated', workspace_id: workspaceId, command_id: command, actor: { kind: 'external-identity', identity }, payload: { membership_id: membershipId, user_account_id: userId } }),
  ]
}
