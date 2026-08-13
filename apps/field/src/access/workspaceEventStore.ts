/**
 * Field's durable local Event Log and Workspace-projection cache. The separate
 * `birdnerd-event-core` database deliberately starts clean: Phase 29 neither
 * reads nor mutates the legacy mutable `birdnerd` database. Events remain the
 * source of truth; the serialized projection is an expendable startup cache.
 */
import { admitWorkspaceEvent, projectWorkspaceEvents, snapshotWorkspaceProjection, type WorkspaceProjectionSnapshot } from '@birdnerd/banding'
import type { DomainEvent } from '@birdnerd/events'
import { EventLog, type AppendResult } from '@birdnerd/sync-state'
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

const DATABASE_NAME = 'birdnerd-event-core'
const DATABASE_VERSION = 1
const PROJECTION_CACHE_KEY = 'workspace-access'

type StoredWorkspaceProjection = WorkspaceProjectionSnapshot & {
  cache_key: typeof PROJECTION_CACHE_KEY
  event_ids: string[]
}

interface WorkspaceEventDatabase extends DBSchema {
  event_log: {
    key: string
    value: DomainEvent
    indexes: { 'by-workspace': string }
  }
  projection_cache: {
    key: string
    value: StoredWorkspaceProjection
  }
}

let database: IDBPDatabase<WorkspaceEventDatabase> | undefined

/**
 * Durable Field storage boundary for append-only Events. `appendAll` persists
 * accepted Events and a derived cache in one IndexedDB transaction; a later
 * hydration always rebuilds the cache from the Event Log before use.
 */
export class WorkspaceEventStore {
  private log: EventLog | undefined

  async snapshot(): Promise<readonly DomainEvent[]> {
    return (await this.getLog()).snapshot()
  }

  async appendAll(events: readonly DomainEvent[]): Promise<readonly AppendResult[]> {
    const log = await this.getLog()
    const results = log.appendAll(events)
    const accepted = results.filter((result): result is Extract<AppendResult, { kind: 'accepted' }> => result.kind === 'accepted')
    if (accepted.length === 0) return results

    try {
      await writeEventsAndProjection(log.snapshot(), accepted.map(result => result.event))
    } catch (error) {
      // A failed transaction must not leave an in-memory log ahead of durable truth.
      this.log = undefined
      throw error
    }
    return results
  }

  private async getLog(): Promise<EventLog> {
    if (this.log) return this.log
    const events = sortEvents(await (await getDatabase()).getAll('event_log'))
    this.log = new EventLog(events, admitWorkspaceEvent)
    await writeProjectionCache(this.log.snapshot())
    return this.log
  }
}

/** Close the cached connection so unit tests can isolate a fresh Event Log database. */
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
    },
  })
  return database
}

async function writeEventsAndProjection(events: readonly DomainEvent[], accepted: readonly DomainEvent[]): Promise<void> {
  const db = await getDatabase()
  const tx = db.transaction(['event_log', 'projection_cache'], 'readwrite')
  for (const event of accepted) await tx.objectStore('event_log').put(event)
  await tx.objectStore('projection_cache').put(projectionCache(events))
  await tx.done
}

async function writeProjectionCache(events: readonly DomainEvent[]): Promise<void> {
  const db = await getDatabase()
  const cache = projectionCache(events)
  const existing = await db.get('projection_cache', PROJECTION_CACHE_KEY)
  if (JSON.stringify(existing) !== JSON.stringify(cache)) await db.put('projection_cache', cache)
}

function projectionCache(events: readonly DomainEvent[]): StoredWorkspaceProjection {
  return {
    cache_key: PROJECTION_CACHE_KEY,
    event_ids: events.map(event => event.event_id),
    ...snapshotWorkspaceProjection(projectWorkspaceEvents(events)),
  }
}

function sortEvents(events: readonly DomainEvent[]): DomainEvent[] {
  return [...events].sort((left, right) => left.event_id.localeCompare(right.event_id))
}
