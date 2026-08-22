/**
 * Field's durable local replica. Immutable Events, exchange state, receipts,
 * HLC high-water, and rebuildable projections are separate IndexedDB stores.
 * The legacy mutable `birdnerd` database is never read or changed here.
 */
import {
  admitWorkspaceEvent,
  projectOperationalEvents,
  projectPilotBanding,
  projectWorkspaceEvents,
  snapshotWorkspaceProjection,
} from '@birdnerd/banding'
import { observeHlc, sameEventContent, tickHlc, upcastEvent, type DomainEvent, type HybridLogicalClock } from '@birdnerd/events'
import {
  EventLog,
  type AppendResult,
  type DurableReplica,
  type ExchangeReceipt,
  type ServerEvent,
  type SyncCommit,
  type SyncInput,
} from '@birdnerd/sync-state'
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

const DATABASE_NAME = 'birdnerd-event-core'
const DATABASE_VERSION = 2
const PROJECTION_CACHE_KEY = 'workspace-current-state'

type QueueEntry = {
  event_id: string
  workspace_id: string
  status: 'pending' | 'accepted' | 'rejected'
  attempt_count: number
  retry_at: number
  last_error?: string
}

type SyncMetadata = {
  workspace_id: string
  cursor: number
  high_water?: HybridLogicalClock
  last_failure?: string
  retry_at?: number
  failure_count?: number
}

type StoredReceipt = { event_id: string; receipt: ExchangeReceipt; recorded_at: number }

type StoredProjection = {
  cache_key: typeof PROJECTION_CACHE_KEY
  event_ids: string[]
  workspace_access: ReturnType<typeof snapshotWorkspaceProjection>
  sessions: ReturnType<typeof projectPilotBanding>['sessions'] extends ReadonlyMap<string, infer T> ? T[] : never
  banding_records: ReturnType<typeof projectPilotBanding>['banding_records'] extends ReadonlyMap<string, infer T> ? T[] : never
  band_allocation_conflicts: ReturnType<typeof projectPilotBanding>['band_allocation_conflicts']
  operational_entities: ReturnType<typeof projectOperationalEvents>['entities'] extends ReadonlyMap<string, infer T> ? T[] : never
  operational_session_crew: string[]
  operational_unresolved_references: ReturnType<typeof projectOperationalEvents>['unresolved_references']
  band_number_conflicts: ReturnType<typeof projectOperationalEvents>['band_number_conflicts']
}

interface WorkspaceEventDatabase extends DBSchema {
  event_log: { key: string; value: DomainEvent; indexes: { 'by-workspace': string } }
  projection_cache: { key: string; value: StoredProjection }
  outbound_queue: { key: string; value: QueueEntry; indexes: { 'by-workspace': string; 'by-status': string } }
  sync_metadata: { key: string; value: SyncMetadata }
  receipts: { key: string; value: StoredReceipt }
}

export type EventPipelineDiagnostics = {
  commands: ReadonlyArray<{ command_id: string; events: readonly DomainEvent[] }>
  projection: StoredProjection
  queue: readonly QueueEntry[]
  metadata?: SyncMetadata
  receipts: readonly StoredReceipt[]
}

let database: IDBPDatabase<WorkspaceEventDatabase> | undefined

/** Durable Field Adapter used by access, command, recovery, and Sync-State Modules. */
export class WorkspaceEventStore implements DurableReplica {
  private log: EventLog | undefined
  private activeWorkspaceId: string | undefined
  private operation = Promise.resolve()

  activateWorkspace(workspaceId: string): void {
    this.activeWorkspaceId = workspaceId
  }

  async snapshot(workspaceId?: string): Promise<readonly DomainEvent[]> {
    const events = (await this.getLog()).snapshot()
    return workspaceId ? events.filter(event => event.workspace_id === workspaceId) : events
  }

  async appendAll(events: readonly DomainEvent[]): Promise<readonly AppendResult[]> {
    return this.exclusive(async () => {
      const current = await this.snapshot()
      const candidateLog = new EventLog(current, admitWorkspaceEvent)
      const rawById = new Map(events.map(event => [event.event_id, event]))
      const results = candidateLog.appendAll(events.map(upcastEvent))
      const accepted = results.filter((result): result is Extract<AppendResult, { kind: 'accepted' }> => result.kind === 'accepted')
      if (accepted.length === 0) return results
      await this.persistLocal(candidateLog.snapshot(), accepted.map(result => rawById.get(result.event.event_id) ?? result.event))
      this.log = new EventLog(candidateLog.snapshot(), () => ({ accepted: true }))
      return results
    })
  }

  async appendAcceptedRemote(items: readonly ServerEvent[]): Promise<void> {
    await this.exclusive(async () => {
      const db = await getDatabase()
      const current = await db.getAll('event_log')
      const byId = new Map(current.map(event => [event.event_id, event]))
      for (const item of items) {
        const event = item.event
        upcastEvent(event)
        const existing = byId.get(event.event_id)
        if (existing && !sameCanonicalEventContent(existing, event)) throw new Error('Remote Event ID conflicts with immutable local content.')
        byId.set(event.event_id, event)
      }
      const events = canonicalEventLog([...byId.values()])
      const tx = db.transaction(['event_log', 'projection_cache', 'sync_metadata'], 'readwrite')
      for (const item of items) await tx.objectStore('event_log').put(item.event)
      await updateHighWater(tx.objectStore('sync_metadata'), items.map(item => item.event))
      await tx.objectStore('projection_cache').put(projectionCache(events))
      await tx.done
      this.log = new EventLog(events, () => ({ accepted: true }))
    })
  }

  async tickClock(workspaceId: string, now = Date.now()): Promise<HybridLogicalClock> {
    return this.exclusive(async () => {
      const db = await getDatabase()
      const metadata = await db.get('sync_metadata', workspaceId) ?? { workspace_id: workspaceId, cursor: 0 }
      const highWater = tickHlc(metadata.high_water, now)
      await db.put('sync_metadata', { ...metadata, high_water: highWater })
      return highWater
    })
  }

  async readSyncInput(limit: number, _now: number): Promise<SyncInput | undefined> {
    if (!this.activeWorkspaceId) return undefined
    const db = await getDatabase()
    const metadata = await db.get('sync_metadata', this.activeWorkspaceId) ?? { workspace_id: this.activeWorkspaceId, cursor: 0 }
    const pending = (await db.getAllFromIndex('outbound_queue', 'by-workspace', this.activeWorkspaceId))
      .filter(item => item.status === 'pending')
    const queue = pending.slice(0, limit)
    const events = await Promise.all(queue.map(item => db.get('event_log', item.event_id)))
    return {
      workspace_id: this.activeWorkspaceId,
      cursor: metadata.cursor,
      pending_events: events.filter((event): event is DomainEvent => event !== undefined),
      has_more_pending: pending.length > queue.length,
      failure_count: metadata.failure_count ?? 0,
      retry_at: metadata.retry_at,
      last_failure: metadata.last_failure,
    }
  }

  async commit(result: SyncCommit): Promise<void> {
    await this.exclusive(async () => {
      const db = await getDatabase()
      const currentEvents = await db.getAll('event_log')
      const queues = await db.getAll('outbound_queue')
      const queueById = new Map(queues.map(item => [item.event_id, { ...item }]))
      const eventsById = new Map(currentEvents.map(event => [event.event_id, event]))
      for (const receipt of result.receipts) {
        const queue = queueById.get(receipt.event_id)
        if (queue) {
          // A deferred receipt is an admission-order dependency, not a
          // failure of the immutable fact. Keep it effective and pending.
          queue.status = receipt.kind === 'rejected' ? 'rejected' : receipt.kind === 'deferred' ? 'pending' : 'accepted'
          queue.last_error = receipt.kind === 'rejected' || receipt.kind === 'deferred' ? receipt.reason : undefined
          queue.attempt_count += 1
          if (receipt.kind === 'deferred' && result.deferred_retry_at !== undefined) queue.retry_at = result.deferred_retry_at
        }
      }
      for (const item of result.pulled) {
        const event = item.event
        upcastEvent(event)
        const existing = eventsById.get(event.event_id)
        if (existing && !sameCanonicalEventContent(existing, event)) throw new Error('Pulled Event conflicts with immutable local content.')
        eventsById.set(event.event_id, event)
      }
      const rejectedIds = new Set([...queueById.values()].filter(item => item.status === 'rejected').map(item => item.event_id))
      const effectiveEvents = canonicalEventLog([...eventsById.values()].filter(event => !rejectedIds.has(event.event_id)))
      const workspaceId = this.activeWorkspaceId ?? result.pulled[0]?.event.workspace_id
      if (!workspaceId) throw new Error('Cannot commit sync without an active Workspace.')
      const metadata = await db.get('sync_metadata', workspaceId) ?? { workspace_id: workspaceId, cursor: 0 }
      let highWater = metadata.high_water
      for (const item of result.pulled) highWater = highWater ? observeHlc(highWater, item.event.hlc, Date.now()) : item.event.hlc

      const tx = db.transaction(['event_log', 'projection_cache', 'outbound_queue', 'sync_metadata', 'receipts'], 'readwrite')
      for (const item of result.pulled) await tx.objectStore('event_log').put(item.event)
      for (const receipt of result.receipts) {
        const queue = queueById.get(receipt.event_id)
        if (queue) await tx.objectStore('outbound_queue').put(queue)
        await tx.objectStore('receipts').put({ event_id: receipt.event_id, receipt, recorded_at: Date.now() })
      }
      const hasDeferred = result.receipts.some(receipt => receipt.kind === 'deferred')
      await tx.objectStore('sync_metadata').put({
        ...metadata,
        cursor: result.cursor,
        high_water: highWater,
        last_failure: hasDeferred ? result.receipts.find(receipt => receipt.kind === 'deferred')?.reason : undefined,
        retry_at: hasDeferred ? result.deferred_retry_at : undefined,
        failure_count: hasDeferred ? (metadata.failure_count ?? 0) + 1 : 0,
      })
      await tx.objectStore('projection_cache').put(projectionCache(effectiveEvents))
      await tx.done
      this.log = new EventLog(effectiveEvents, () => ({ accepted: true }))
    })
  }

  async recordFailure(message: string, retryAt: number): Promise<void> {
    if (!this.activeWorkspaceId) return
    const db = await getDatabase()
    const metadata = await db.get('sync_metadata', this.activeWorkspaceId) ?? { workspace_id: this.activeWorkspaceId, cursor: 0 }
    const tx = db.transaction(['sync_metadata', 'outbound_queue'], 'readwrite')
    await tx.objectStore('sync_metadata').put({ ...metadata, last_failure: message, retry_at: retryAt, failure_count: (metadata.failure_count ?? 0) + 1 })
    const queue = await tx.objectStore('outbound_queue').index('by-workspace').getAll(this.activeWorkspaceId)
    for (const entry of queue.filter(item => item.status === 'pending')) {
      await tx.objectStore('outbound_queue').put({ ...entry, attempt_count: entry.attempt_count + 1, retry_at: retryAt, last_error: message })
    }
    await tx.done
  }

  async exportWorkspaceEvents(workspaceId: string): Promise<readonly DomainEvent[]> {
    const db = await getDatabase()
    const events = await db.getAllFromIndex('event_log', 'by-workspace', workspaceId)
    const queue = await db.getAllFromIndex('outbound_queue', 'by-workspace', workspaceId)
    const rejected = new Set(queue.filter(item => item.status === 'rejected').map(item => item.event_id))
    return sortEvents(events.filter(event => !rejected.has(event.event_id)))
  }

  async restoreWorkspace(workspaceId: string, bundleEvents: readonly DomainEvent[]): Promise<{ protected_pending: number }> {
    return this.exclusive(async () => {
      const db = await getDatabase()
      const currentEvents = await db.getAllFromIndex('event_log', 'by-workspace', workspaceId)
      const queue = await db.getAllFromIndex('outbound_queue', 'by-workspace', workspaceId)
      const pendingIds = new Set(queue.filter(item => item.status === 'pending').map(item => item.event_id))
      const pending = currentEvents.filter(event => pendingIds.has(event.event_id))
      const replacement = new Map(bundleEvents.map(event => [event.event_id, event]))
      for (const event of currentEvents) {
        const bundled = replacement.get(event.event_id)
        if (bundled && !sameCanonicalEventContent(bundled, event)) throw new Error('Bundle Event conflicts with immutable local Event content.')
      }
      for (const event of pending) {
        replacement.set(event.event_id, event)
      }
      const events = [...replacement.values()]
      const canonicalEvents = canonicalEventLog(events)
      const tx = db.transaction(['event_log', 'projection_cache', 'outbound_queue', 'sync_metadata', 'receipts'], 'readwrite')
      for (const event of currentEvents) await tx.objectStore('event_log').delete(event.event_id)
      for (const entry of queue) await tx.objectStore('outbound_queue').delete(entry.event_id)
      for (const event of currentEvents) await tx.objectStore('receipts').delete(event.event_id)
      for (const event of events) await tx.objectStore('event_log').put(event)
      for (const event of pending) await tx.objectStore('outbound_queue').put({ event_id: event.event_id, workspace_id: workspaceId, status: 'pending', attempt_count: 0, retry_at: 0 })
      await tx.objectStore('sync_metadata').put({ workspace_id: workspaceId, cursor: 0, high_water: maxClock(events) })
      await tx.objectStore('projection_cache').put(projectionCache(canonicalEvents))
      await tx.done
      this.log = new EventLog(canonicalEvents, () => ({ accepted: true }))
      return { protected_pending: pending.length }
    })
  }

  async diagnostics(workspaceId: string): Promise<EventPipelineDiagnostics> {
    const db = await getDatabase()
    const events = sortEvents((await db.getAllFromIndex('event_log', 'by-workspace', workspaceId)).map(upcastEvent))
    const queue = await db.getAllFromIndex('outbound_queue', 'by-workspace', workspaceId)
    const rejected = new Set(queue.filter(item => item.status === 'rejected').map(item => item.event_id))
    const effectiveEvents = events.filter(event => !rejected.has(event.event_id))
    const commands = new Map<string, DomainEvent[]>()
    events.forEach(event => commands.set(event.command_id, [...(commands.get(event.command_id) ?? []), event]))
    return {
      commands: [...commands.entries()].map(([command_id, commandEvents]) => ({ command_id, events: commandEvents })),
      projection: projectionCache(effectiveEvents),
      queue,
      metadata: await db.get('sync_metadata', workspaceId),
      receipts: (await db.getAll('receipts')).filter(item => events.some(event => event.event_id === item.event_id)),
    }
  }

  private async persistLocal(events: readonly DomainEvent[], accepted: readonly DomainEvent[]): Promise<void> {
    const db = await getDatabase()
    const tx = db.transaction(['event_log', 'projection_cache', 'outbound_queue', 'sync_metadata'], 'readwrite')
    for (const event of accepted) {
      await tx.objectStore('event_log').put(event)
      await tx.objectStore('outbound_queue').put({ event_id: event.event_id, workspace_id: event.workspace_id, status: 'pending', attempt_count: 0, retry_at: 0 })
    }
    await updateHighWater(tx.objectStore('sync_metadata'), accepted)
    await tx.objectStore('projection_cache').put(projectionCache(events))
    await tx.done
  }

  private async getLog(): Promise<EventLog> {
    if (this.log) return this.log
    const db = await getDatabase()
    const events = await db.getAll('event_log')
    const queue = await db.getAll('outbound_queue')
    const rejected = new Set(queue.filter(item => item.status === 'rejected').map(item => item.event_id))
    const effective = sortEvents(events.filter(event => !rejected.has(event.event_id)).map(upcastEvent))
    this.log = new EventLog(effective, () => ({ accepted: true }))
    await db.put('projection_cache', projectionCache(effective))
    return this.log
  }

  private async exclusive<T>(work: () => Promise<T>): Promise<T> {
    const result = this.operation.then(work)
    this.operation = result.then(() => undefined, () => undefined)
    return result
  }
}

export function resetWorkspaceEventStore(): void {
  database?.close()
  database = undefined
}

async function getDatabase(): Promise<IDBPDatabase<WorkspaceEventDatabase>> {
  if (database) return database
  database = await openDB<WorkspaceEventDatabase>(DATABASE_NAME, DATABASE_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const eventLog = db.createObjectStore('event_log', { keyPath: 'event_id' })
        eventLog.createIndex('by-workspace', 'workspace_id')
        db.createObjectStore('projection_cache', { keyPath: 'cache_key' })
      }
      if (oldVersion < 2) {
        const queue = db.createObjectStore('outbound_queue', { keyPath: 'event_id' })
        queue.createIndex('by-workspace', 'workspace_id')
        queue.createIndex('by-status', 'status')
        db.createObjectStore('sync_metadata', { keyPath: 'workspace_id' })
        db.createObjectStore('receipts', { keyPath: 'event_id' })
      }
    },
  })
  return database
}

function projectionCache(events: readonly DomainEvent[]): StoredProjection {
  const canonicalEvents = canonicalEventLog(events)
  const pilot = projectPilotBanding(canonicalEvents)
  const operational = projectOperationalEvents(canonicalEvents)
  return {
    cache_key: PROJECTION_CACHE_KEY,
    event_ids: canonicalEvents.map(event => event.event_id),
    workspace_access: snapshotWorkspaceProjection(projectWorkspaceEvents(canonicalEvents)),
    sessions: [...pilot.sessions.values()],
    banding_records: [...pilot.banding_records.values()],
    band_allocation_conflicts: pilot.band_allocation_conflicts,
    operational_entities: [...operational.entities.values()],
    operational_session_crew: [...operational.session_crew],
    operational_unresolved_references: operational.unresolved_references,
    band_number_conflicts: operational.band_number_conflicts,
  }
}

type SyncMetadataStore = {
  get(key: string): Promise<SyncMetadata | undefined>
  put(value: SyncMetadata): Promise<unknown>
}

async function updateHighWater(store: SyncMetadataStore, events: readonly DomainEvent[]): Promise<void> {
  const byWorkspace = new Map<string, DomainEvent[]>()
  events.forEach(event => byWorkspace.set(event.workspace_id, [...(byWorkspace.get(event.workspace_id) ?? []), event]))
  for (const [workspaceId, workspaceEvents] of byWorkspace) {
    const metadata = await store.get(workspaceId)
    let highWater = metadata?.high_water
    for (const event of workspaceEvents) highWater = highWater ? observeHlc(highWater, event.hlc, Date.now()) : event.hlc
    await store.put({ ...(metadata ?? { workspace_id: workspaceId, cursor: 0 }), high_water: highWater })
  }
}

function maxClock(events: readonly DomainEvent[]): HybridLogicalClock | undefined {
  return events.reduce<HybridLogicalClock | undefined>((winner, event) => {
    if (!winner || event.hlc.physical_ms > winner.physical_ms || (event.hlc.physical_ms === winner.physical_ms && event.hlc.logical > winner.logical)) return event.hlc
    return winner
  }, undefined)
}

function sortEvents(events: readonly DomainEvent[]): DomainEvent[] {
  return [...events].sort((left, right) => left.event_id.localeCompare(right.event_id))
}

/**
 * The durable Event Log retains its original immutable bytes. Every consumer
 * of that log crosses this seam, which interprets supported history as the
 * canonical current Event shape before replay or projection.
 */
function canonicalEventLog(events: readonly DomainEvent[]): DomainEvent[] {
  return sortEvents(events.map(upcastEvent))
}

function sameCanonicalEventContent(left: DomainEvent, right: DomainEvent): boolean {
  return sameEventContent(upcastEvent(left), upcastEvent(right))
}
