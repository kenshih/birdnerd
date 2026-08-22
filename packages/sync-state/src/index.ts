/**
 * Generic immutable Event replication. It knows portable Event Contracts but
 * never banding decisions, projections, IndexedDB, Supabase, or Field UI.
 */

import { assertEvent, sameEventContent, upcastEvent, type DomainEvent, type PersistedEvent } from '@birdnerd/events'

export type EventAdmission = (candidate: DomainEvent, existingEvents: readonly DomainEvent[]) =>
  | { accepted: true }
  | { accepted: false; reason: string }

export type AppendResult =
  | { kind: 'accepted'; event: DomainEvent }
  | { kind: 'duplicate'; event: DomainEvent }
  | { kind: 'rejected'; event: DomainEvent; reason: string }

/**
 * In-memory command-side view of an append-only Event Log. A caller persists
 * accepted results before exposing a rebuilt projection; retries of identical
 * immutable events remain duplicates rather than second writes.
 */
export class EventLog {
  private readonly events: DomainEvent[]

  constructor(initialEvents: readonly DomainEvent[] = [], private readonly admit: EventAdmission) {
    this.events = []
    for (const event of initialEvents) {
      const result = this.append(event)
      if (result.kind === 'rejected') throw new Error(`Initial Event Log entry was rejected: ${result.reason}`)
    }
  }

  snapshot(): readonly DomainEvent[] {
    return [...this.events]
  }

  append(event: DomainEvent): AppendResult {
    assertEvent(event)
    const existing = this.events.find(candidate => candidate.event_id === event.event_id)
    if (existing) {
      if (sameEventContent(existing, event)) return { kind: 'duplicate', event: existing }
      return { kind: 'rejected', event, reason: 'Event ID conflicts with an existing immutable event.' }
    }

    const decision = this.admit(event, this.snapshot())
    if (!decision.accepted) return { kind: 'rejected', event, reason: decision.reason }
    this.events.push(event)
    return { kind: 'accepted', event }
  }

  appendAll(events: readonly DomainEvent[]): AppendResult[] {
    return events.map(event => this.append(event))
  }
}

export type ExchangeReceipt =
  | { kind: 'accepted'; event_id: string; server_sequence: number }
  | { kind: 'duplicate'; event_id: string; server_sequence: number }
  /** A referenced entity is not known by the admission index yet. The Event
   * remains locally effective and must be retried; this is not a rejection. */
  | { kind: 'deferred'; event_id: string; reason: string; retryable: true }
  | { kind: 'rejected'; event_id: string; reason: string; permanent: true }

/** Raw validated server history; the durable replica owns interpretation. */
export type ServerEvent = { event: PersistedEvent; server_sequence: number }

export type InitialAccessResult =
  | { kind: 'active'; events: readonly ServerEvent[] }
  | { kind: 'no-access' }

/** Internal provider seam. Adapters translate transport only. */
export interface EventExchange {
  claimInitialAccess(): Promise<InitialAccessResult>
  /** Exchange retains validated immutable Event JSON exactly as queued. */
  push(events: readonly PersistedEvent[]): Promise<readonly ExchangeReceipt[]>
  pull(workspaceId: string, afterServerSequence: number, limit: number): Promise<readonly ServerEvent[]>
}

export type SyncInput = {
  workspace_id: string
  cursor: number
  /** Raw immutable Event JSON ready for outbound exchange. */
  pending_events: readonly PersistedEvent[]
  has_more_pending: boolean
  failure_count: number
  /** Number of retryable admission dependencies durably waiting in the queue. */
  deferred_count?: number
  /** Durable IDs make deferred state accurate when a batch omits some queue work. */
  deferred_event_ids?: readonly string[]
  /** Per-Event deadlines distinguish a freshly retried dependency from an
   * untouched queued dependency when deriving the next visible retry time. */
  deferred_events?: readonly { event_id: string; retry_at: number; reason?: string }[]
  retry_at?: number
  last_failure?: string
}

export type SyncCommit = {
  receipts: readonly ExchangeReceipt[]
  pulled: readonly ServerEvent[]
  cursor: number
  /** Persisted with deferred receipts so a restart does not retry tightly. */
  deferred_retry_at?: number
}

/** An explicit user retry may include deferred queue work that an automatic
 * bounded batch would otherwise leave behind ordinary pending Events. */
export type SyncReadOptions = { force?: boolean }

/**
 * Durable replica seam owned by Field. `commit` must make received Events,
 * receipts, projection state, HLC high-water, and cursor durable atomically;
 * a cursor is never advanced for Events that could be lost after a crash.
 */
export interface DurableReplica {
  readSyncInput(limit: number, now: number, options?: SyncReadOptions): Promise<SyncInput | undefined>
  commit(result: SyncCommit): Promise<void>
  recordFailure(message: string, retryAt: number): Promise<void>
}

export type SyncStatus =
  | { kind: 'idle'; last_synced_at?: number }
  | { kind: 'syncing' }
  | { kind: 'offline'; message: string; retry_at: number }
  /** A retryable admission dependency remains queued locally. It is not synced. */
  | { kind: 'deferred'; deferred: number; message: string; retry_at: number }
  | { kind: 'attention'; rejected: number; last_synced_at: number }

export type SyncListener = (status: SyncStatus) => void

export interface SyncCoordinator {
  getState(): SyncStatus
  subscribe(listener: SyncListener): () => void
  /** Force bypasses a persisted retry deadline for an explicit user Sync Now. */
  synchronize(options?: { force?: boolean }): Promise<SyncStatus>
}

/**
 * Coordinate push receipts and server-ordered pull pages. Concurrent calls
 * share one run; network failure retains pending Events and schedules bounded
 * exponential retry through the durable replica.
 */
export function createSyncCoordinator(
  replica: DurableReplica,
  exchange: EventExchange,
  options: { batch_size?: number; now?: () => number; retry_base_ms?: number; retry_max_ms?: number; schedule?: (run: () => void, delayMs: number) => void } = {},
): SyncCoordinator {
  const batchSize = options.batch_size ?? 100
  const now = options.now ?? Date.now
  const retryBaseMs = options.retry_base_ms ?? 1_000
  const retryMaxMs = options.retry_max_ms ?? 60_000
  const schedule = options.schedule ?? ((run, delayMs) => { setTimeout(run, delayMs) })
  const listeners = new Set<SyncListener>()
  let state: SyncStatus = { kind: 'idle' }
  let running: Promise<SyncStatus> | undefined
  let consecutiveFailures = 0
  let scheduledRetryAt: number | undefined

  const publish = (next: SyncStatus) => {
    state = next
    listeners.forEach(listener => listener(next))
    return next
  }

  const coordinator: SyncCoordinator = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      listener(state)
      return () => listeners.delete(listener)
    },
    synchronize(options = {}) {
      if (running) return running
      running = run(options.force === true).finally(() => { running = undefined })
      return running
    },
  }
  return coordinator

  async function run(force: boolean): Promise<SyncStatus> {
    publish({ kind: 'syncing' })
    let input: SyncInput | undefined
    try {
      const startedAt = now()
      input = await replica.readSyncInput(batchSize, startedAt, { force })
      if (!input) {
        consecutiveFailures = 0
        return publish({ kind: 'idle', last_synced_at: now() })
      }
      const deferredEventIds = new Set(input.deferred_event_ids ?? [])
      const retryAt = input.retry_at
      const waitingForRetry = !force && retryAt !== undefined && retryAt > startedAt
      const waitingForDeferredRetry = waitingForRetry && (input.deferred_count ?? 0) > 0
      // A deferred retry deadline applies only to the known deferred Events.
      // Keep unrelated queue work moving; count-only legacy adapters remain
      // conservative because they cannot identify an eligible Event safely.
      const eventsToPush = waitingForDeferredRetry
        ? input.deferred_event_ids === undefined
          ? []
          : input.pending_events.filter(event => !deferredEventIds.has(event.event_id))
        : input.pending_events
      if (waitingForRetry && (!waitingForDeferredRetry || eventsToPush.length === 0)) {
        scheduleAt(retryAt!)
        return waitingForDeferredRetry
          ? publish({ kind: 'deferred', deferred: input.deferred_count!, message: input.last_failure ?? 'Referenced Event is not indexed yet.', retry_at: retryAt! })
          : publish({ kind: 'offline', message: input.last_failure ?? 'Waiting to retry Event exchange.', retry_at: retryAt! })
      }
      const receipts = eventsToPush.length > 0 ? await exchange.push(eventsToPush) : []
      let cursor = input.cursor
      let rejected = receipts.filter(receipt => receipt.kind === 'rejected').length
      const deferred = receipts.filter(receipt => receipt.kind === 'deferred')
      let outstandingDeferred = input.deferred_count ?? deferredEventIds.size
      for (const receipt of receipts) {
        if (receipt.kind === 'deferred') {
          if (!deferredEventIds.has(receipt.event_id)) outstandingDeferred += 1
          deferredEventIds.add(receipt.event_id)
        } else if (deferredEventIds.delete(receipt.event_id)) {
          outstandingDeferred = Math.max(0, outstandingDeferred - 1)
        }
      }
      const deferredRetryAt = deferred.length > 0
        ? startedAt + Math.min(retryMaxMs, retryBaseMs * (2 ** Math.max(0, input.failure_count)))
        : undefined
      let firstPage = true
      do {
        const pulled = await exchange.pull(input.workspace_id, cursor, batchSize)
        const nextCursor = pulled.length > 0 ? pulled[pulled.length - 1].server_sequence : cursor
        await replica.commit({ receipts: firstPage ? receipts : [], pulled, cursor: nextCursor, deferred_retry_at: firstPage ? deferredRetryAt : undefined })
        firstPage = false
        cursor = nextCursor
        if (pulled.length < batchSize) break
      } while (true)
      consecutiveFailures = 0
      const completedAt = now()
      const retriedDeferredEventIds = new Set(deferred.map(receipt => receipt.event_id))
      const deferredRetryAtByEventId = new Map(input.deferred_events?.map(item => [item.event_id, item.retry_at]))
      const untouchedDeferredEventIds = [...deferredEventIds]
        .filter(eventId => !retriedDeferredEventIds.has(eventId))
      const hasUnidentifiedUntouchedDeferred = outstandingDeferred > deferredEventIds.size
        || untouchedDeferredEventIds.some(eventId => !deferredRetryAtByEventId.has(eventId))
      // A fresh deferred receipt replaces that Event's prior deadline. Only
      // distinct, untouched dependencies retain their existing earliest time.
      const outstandingRetryAt = earliestRetryAt(
        deferredRetryAt,
        ...untouchedDeferredEventIds.map(eventId => deferredRetryAtByEventId.get(eventId)),
        hasUnidentifiedUntouchedDeferred ? input.retry_at : undefined,
      )
      const completed = rejected > 0
        ? publish({ kind: 'attention', rejected, last_synced_at: completedAt })
        : outstandingDeferred > 0
          ? publish({ kind: 'deferred', deferred: outstandingDeferred, message: deferred[0]?.reason ?? input.last_failure ?? 'Referenced Event is not indexed yet.', retry_at: outstandingRetryAt ?? completedAt })
          : publish({ kind: 'idle', last_synced_at: completedAt })
      if (input.has_more_pending) scheduleAt(completedAt)
      if (outstandingRetryAt !== undefined) scheduleAt(outstandingRetryAt)
      return completed
    } catch (error) {
      consecutiveFailures = Math.max(consecutiveFailures, input?.failure_count ?? 0) + 1
      const message = error instanceof Error ? error.message : 'Event exchange failed.'
      const retryAt = now() + Math.min(retryMaxMs, retryBaseMs * (2 ** (consecutiveFailures - 1)))
      await replica.recordFailure(message, retryAt)
      scheduleAt(retryAt)
      return input?.deferred_count && input.deferred_count > 0
        ? publish({ kind: 'deferred', deferred: input.deferred_count, message: input.last_failure ?? 'Referenced Event is not indexed yet.', retry_at: retryAt })
        : publish({ kind: 'offline', message, retry_at: retryAt })
    }
  }

  function scheduleAt(runAt: number): void {
    if (scheduledRetryAt !== undefined && scheduledRetryAt <= runAt) return
    scheduledRetryAt = runAt
    schedule(() => {
      scheduledRetryAt = undefined
      void coordinator.synchronize()
    }, Math.max(0, runAt - now()))
  }
}

/** Deterministic Event-exchange Adapter for coordinator contract tests. */
export class InMemoryEventExchange implements EventExchange {
  private readonly events: ServerEvent[] = []

  constructor(initialEvents: readonly PersistedEvent[] = [], private initialAccess: InitialAccessResult = { kind: 'no-access' }) {
    initialEvents.forEach(event => this.append(event))
  }

  setInitialAccess(result: InitialAccessResult): void {
    this.initialAccess = result
  }

  async claimInitialAccess(): Promise<InitialAccessResult> {
    return this.initialAccess
  }

  async push(events: readonly PersistedEvent[]): Promise<readonly ExchangeReceipt[]> {
    return events.map(event => {
      const existing = this.events.find(candidate => candidate.event.event_id === event.event_id)
      if (existing) {
        return sameEventContent(existing.event, event)
          ? { kind: 'duplicate' as const, event_id: event.event_id, server_sequence: existing.server_sequence }
          : { kind: 'rejected' as const, event_id: event.event_id, reason: 'Event ID conflicts with immutable content.', permanent: true as const }
      }
      return { kind: 'accepted' as const, event_id: event.event_id, server_sequence: this.append(event).server_sequence }
    })
  }

  async pull(workspaceId: string, afterServerSequence: number, limit: number): Promise<readonly ServerEvent[]> {
    return this.events
      .filter(item => item.event.workspace_id === workspaceId && item.server_sequence > afterServerSequence)
      .slice(0, limit)
  }

  private append(event: PersistedEvent): ServerEvent {
    upcastEvent(event)
    const item = { event, server_sequence: this.events.length + 1 }
    this.events.push(item)
    return item
  }
}

function earliestRetryAt(...values: Array<number | undefined>): number | undefined {
  return values.reduce<number | undefined>((earliest, value) => value === undefined ? earliest : earliest === undefined ? value : Math.min(earliest, value), undefined)
}
