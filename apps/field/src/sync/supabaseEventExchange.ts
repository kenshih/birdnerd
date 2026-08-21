import { upcastEvent, type DomainEvent } from '@birdnerd/events'
import type { EventExchange, ExchangeReceipt, InitialAccessResult, ServerEvent } from '@birdnerd/sync-state'

type RpcResult = { data: unknown; error: { message: string } | null }
type SupabaseRpcPort = { rpc(name: string, parameters?: Record<string, unknown>): PromiseLike<RpcResult> }

/** Supabase transport Adapter; domain projection and durable state stay in Field. */
export function createSupabaseEventExchange(supabase: SupabaseRpcPort): EventExchange {
  return {
    async claimInitialAccess(): Promise<InitialAccessResult> {
      const rows = await rpcRows(supabase, 'birdnerd_claim_initial_access')
      if (rows.length === 0) return { kind: 'no-access' }
      const events = orderedServerEvents(rows, 0)
      if (events.some(item => item.event.workspace_id !== events[0].event.workspace_id)) throw new Error('Initial-access response crossed Workspace scope.')
      return { kind: 'active', events }
    },
    async push(events: readonly DomainEvent[]): Promise<readonly ExchangeReceipt[]> {
      const rows = await rpcRows(supabase, 'birdnerd_append_events', { events })
      const receipts = rows.map(row => receipt(row.receipt))
      const expected = new Set(events.map(event => event.event_id))
      if (receipts.length !== expected.size || receipts.some(item => !expected.delete(item.event_id)) || expected.size !== 0) {
        throw new Error('Event receipt set does not match the pushed batch.')
      }
      return receipts
    },
    async pull(workspaceId: string, afterServerSequence: number, limit: number): Promise<readonly ServerEvent[]> {
      const rows = await rpcRows(supabase, 'birdnerd_pull_events', {
        workspace_id: workspaceId,
        after_server_sequence: afterServerSequence,
        page_size: limit,
      })
      const events = orderedServerEvents(rows, afterServerSequence)
      if (events.length > limit) throw new Error('Pulled Event page exceeded the requested limit.')
      if (events.some(item => item.event.workspace_id !== workspaceId)) throw new Error('Pulled Event crossed Workspace scope.')
      return events
    },
  }
}

async function rpcRows(supabase: SupabaseRpcPort, name: string, parameters?: Record<string, unknown>): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.rpc(name, parameters)
  if (error) throw new Error(error.message)
  if (!Array.isArray(data)) throw new Error(`${name} returned an invalid response.`)
  return data.map(row => {
    if (!isRecord(row)) throw new Error(`${name} returned an invalid row.`)
    return row
  })
}

function serverEvent(row: Record<string, unknown>): ServerEvent {
  if (!Number.isSafeInteger(row.server_sequence) || (row.server_sequence as number) < 1) throw new Error('Server Event sequence is invalid.')
  return { server_sequence: row.server_sequence as number, event: upcastEvent(row.event_json) }
}

function orderedServerEvents(rows: readonly Record<string, unknown>[], afterServerSequence: number): ServerEvent[] {
  const events = rows.map(serverEvent)
  let previous = afterServerSequence
  for (const item of events) {
    if (item.server_sequence <= previous) throw new Error('Server Events are not in strictly increasing sequence order.')
    previous = item.server_sequence
  }
  return events
}

function receipt(value: unknown): ExchangeReceipt {
  if (!isRecord(value) || typeof value.kind !== 'string' || typeof value.event_id !== 'string') throw new Error('Event receipt is invalid.')
  if ((value.kind === 'accepted' || value.kind === 'duplicate') && Number.isSafeInteger(value.server_sequence)) {
    return { kind: value.kind, event_id: value.event_id, server_sequence: value.server_sequence as number }
  }
  if (value.kind === 'deferred' && typeof value.reason === 'string' && value.retryable === true) {
    return { kind: 'deferred', event_id: value.event_id, reason: value.reason, retryable: true }
  }
  if (value.kind === 'rejected' && typeof value.reason === 'string' && value.permanent === true) {
    return { kind: 'rejected', event_id: value.event_id, reason: value.reason, permanent: true }
  }
  throw new Error('Event receipt is invalid.')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
