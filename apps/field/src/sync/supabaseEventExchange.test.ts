import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEvent } from '@birdnerd/events'
import { openDB } from 'idb'
import { resetWorkspaceEventStore, WorkspaceEventStore } from '../access/workspaceEventStore'
import { createSupabaseEventExchange } from './supabaseEventExchange'

const event = createEvent({
  event_type: 'session.created',
  workspace_id: '018f8c7b-0000-7000-8000-000000000001',
  command_id: '018f8c7b-0000-7000-8000-000000000002',
  actor: { kind: 'user-account', user_account_id: '018f8c7b-0000-7000-8000-000000000003' },
  payload: { session_id: '018f8c7b-0000-7000-8000-000000000004', fields: {} },
})

beforeEach(async () => {
  resetWorkspaceEventStore()
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('birdnerd-event-core')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
})

describe('Supabase Event exchange adapter', () => {
  it('translates claim, push receipts, and server-sequenced pulls', async () => {
    const rpc = vi.fn(async (name: string) => {
      if (name === 'birdnerd_claim_initial_access') return { data: [{ server_sequence: 1, event_json: event }], error: null }
      if (name === 'birdnerd_append_events') return { data: [{ receipt: { kind: 'duplicate', event_id: event.event_id, server_sequence: 1 } }], error: null }
      return { data: [{ server_sequence: 1, event_json: event }], error: null }
    })
    const exchange = createSupabaseEventExchange({ rpc })

    await expect(exchange.claimInitialAccess()).resolves.toMatchObject({ kind: 'active', events: [{ server_sequence: 1, event }] })
    await expect(exchange.push([event])).resolves.toEqual([{ kind: 'duplicate', event_id: event.event_id, server_sequence: 1 }])
    await expect(exchange.pull(event.workspace_id, 0, 100)).resolves.toEqual([{ server_sequence: 1, event }])
  })

  it('surfaces RPC errors and rejects malformed transport data', async () => {
    const failed = createSupabaseEventExchange({ rpc: async () => ({ data: null, error: { message: 'offline' } }) })
    await expect(failed.claimInitialAccess()).rejects.toThrow('offline')
    const malformed = createSupabaseEventExchange({ rpc: async () => ({ data: [{ server_sequence: 0, event_json: event }], error: null }) })
    await expect(malformed.claimInitialAccess()).rejects.toThrow('sequence')

    const missingReceipt = createSupabaseEventExchange({ rpc: async () => ({ data: [], error: null }) })
    await expect(missingReceipt.push([event])).rejects.toThrow('receipt set')

    const outOfOrder = createSupabaseEventExchange({ rpc: async () => ({
      data: [
        { server_sequence: 2, event_json: event },
        { server_sequence: 1, event_json: event },
      ],
      error: null,
    }) })
    await expect(outOfOrder.pull(event.workspace_id, 0, 100)).rejects.toThrow('sequence order')

    const crossWorkspace = createSupabaseEventExchange({ rpc: async () => ({
      data: [{
        server_sequence: 1,
        event_json: createEvent({
          ...event,
          event_id: '018f8c7b-0000-7000-8000-000000000005',
          workspace_id: '018f8c7b-0000-7000-8000-000000000006',
        }),
      }],
      error: null,
    }) })
    await expect(crossWorkspace.pull(event.workspace_id, 0, 100)).rejects.toThrow('Workspace scope')
  })

  it('sends a raw compatible historical Event to the append RPC unchanged', async () => {
    const raw = createEvent({
      event_id: '018f8c7b-0000-7000-8000-000000000041', event_type: 'session.created', event_schema_version: 1,
      workspace_id: event.workspace_id, command_id: event.command_id, actor: event.actor,
      payload: { session_id: '018f8c7b-0000-7000-8000-000000000042', session_date: '2026-08-13' },
    })
    const rpc = vi.fn(async () => ({
      data: [{ receipt: { kind: 'duplicate', event_id: raw.event_id, server_sequence: 1 } }], error: null,
    }))
    const exchange = createSupabaseEventExchange({ rpc })

    await expect(exchange.push([raw])).resolves.toEqual([
      { kind: 'duplicate', event_id: raw.event_id, server_sequence: 1 },
    ])
    expect(rpc).toHaveBeenCalledWith('birdnerd_append_events', { events: [raw] })
  })

  it('persists raw Phase 30 Event JSON received through a normal server pull while replaying it canonically', async () => {
    const historicSessionId = '018f8c7b-0000-7000-8000-000000000042'
    const historicRecordId = '018f8c7b-0000-7000-8000-000000000044'
    const historicSession = createEvent({
      event_id: '018f8c7b-0000-7000-8000-000000000041', event_type: 'session.created', event_schema_version: 1,
      workspace_id: event.workspace_id, command_id: event.command_id, actor: event.actor,
      payload: { session_id: historicSessionId, session_date: '2026-08-13' },
    })
    const historicRecord = createEvent({
      event_id: '018f8c7b-0000-7000-8000-000000000043', event_type: 'banding-record.created', event_schema_version: 1,
      workspace_id: event.workspace_id, command_id: event.command_id, actor: event.actor,
      payload: { record_id: historicRecordId, session_id: historicSessionId, species_code: 'AMRO' },
    })
    const exchange = createSupabaseEventExchange({
      rpc: async name => {
        expect(name).toBe('birdnerd_pull_events')
        return {
          data: [
            { server_sequence: 1, event_json: historicSession },
            { server_sequence: 2, event_json: historicRecord },
          ],
          error: null,
        }
      },
    })

    const pulled = await exchange.pull(event.workspace_id, 0, 100)
    expect(pulled[1]?.event).toEqual(historicRecord)

    const store = new WorkspaceEventStore()
    store.activateWorkspace(event.workspace_id)
    await store.commit({ receipts: [], pulled, cursor: 2 })

    const database = await openDB('birdnerd-event-core', 2)
    expect(await database.get('event_log', historicRecord.event_id)).toEqual(historicRecord)
    database.close()
    expect((await store.diagnostics(event.workspace_id)).projection.banding_records
      .find(record => record.record_id === historicRecordId))
      .toMatchObject({ species_code: 'AMRO' })
  })
})
