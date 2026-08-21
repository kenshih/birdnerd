import { describe, expect, it, vi } from 'vitest'
import { createEvent } from '@birdnerd/events'
import { createSupabaseEventExchange } from './supabaseEventExchange'

const event = createEvent({
  event_type: 'session.created',
  workspace_id: '018f8c7b-0000-7000-8000-000000000001',
  command_id: '018f8c7b-0000-7000-8000-000000000002',
  actor: { kind: 'user-account', user_account_id: '018f8c7b-0000-7000-8000-000000000003' },
  payload: { session_id: '018f8c7b-0000-7000-8000-000000000004', fields: {} },
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
})
