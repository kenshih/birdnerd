import { BUNDLE_VERSION, type DataBundle } from '../data/bundle-schema'
import { getDB } from '../db'

/** Export all managed data as a DataBundle object. */
export async function exportDataBundle(): Promise<DataBundle> {
  const db = await getDB()
  const [locations, nets, people, banders, sessions, sessionBanderLogs, sessionNetLogs, records] = await Promise.all([
    db.getAll('locations'),
    db.getAll('nets'),
    db.getAll('people'),
    db.getAll('banders'),
    db.getAll('sessions'),
    db.getAll('sessionBanderLogs'),
    db.getAll('sessionNetLogs'),
    db.getAll('records'),
  ])
  return {
    version: BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    locations,
    nets,
    people,
    banders,
    sessions,
    sessionBanderLogs,
    sessionNetLogs,
    records,
  }
}

/** Download a DataBundle as a JSON file. */
export function downloadBundle(bundle: DataBundle) {
  const date = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `birdnerd-backup-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** Validate a parsed JSON object as a DataBundle. Returns an error string or null. */
export function validateBundle(data: unknown): string | null {
  if (!data || typeof data !== 'object') return 'Invalid file: not a JSON object'
  const bundle = data as Record<string, unknown>

  if (typeof bundle.version !== 'number') return 'Invalid bundle: missing version field'
  if (bundle.version > BUNDLE_VERSION) {
    return `Bundle version ${bundle.version} is newer than this app supports (v${BUNDLE_VERSION}). Please update BirdNerd first.`
  }

  const requiredArrays = ['locations', 'nets', 'people', 'banders', 'sessions', 'records']
  for (const key of requiredArrays) {
    if (!Array.isArray(bundle[key])) return `Invalid bundle: missing or invalid "${key}" array`
  }

  // sessionBanderLogs added in v2 — optional for v1 bundles
  if (bundle.sessionBanderLogs !== undefined && !Array.isArray(bundle.sessionBanderLogs)) {
    return 'Invalid bundle: "sessionBanderLogs" must be an array'
  }

  // sessionNetLogs added in v2 — optional for v1 bundles
  if (bundle.sessionNetLogs !== undefined && !Array.isArray(bundle.sessionNetLogs)) {
    return 'Invalid bundle: "sessionNetLogs" must be an array'
  }

  return null
}

/**
 * Migrate a v1 bundle to v2 format.
 * v1 sessions had { station: string } — v2 uses { locationId: string, updatedAt: string, ... }
 */
function migrateV1ToV2(bundle: Record<string, unknown>): void {
  const sessions = bundle.sessions as Record<string, unknown>[]
  const locations = bundle.locations as Array<{ id: string; banderLocationId: string }>

  for (const session of sessions) {
    if ('station' in session && !('locationId' in session)) {
      // Map station code (e.g. "GCBS") to location ID
      const loc = locations.find(l => l.banderLocationId === session.station)
      session.locationId = loc?.id ?? ''
      delete session.station
    }
    if (!session.updatedAt) {
      session.updatedAt = session.createdAt as string
    }
  }

  // Ensure sessionBanderLogs exists (empty for v1)
  if (!bundle.sessionBanderLogs) {
    bundle.sessionBanderLogs = []
  }

  // Ensure sessionNetLogs exists (empty for v1)
  if (!bundle.sessionNetLogs) {
    bundle.sessionNetLogs = []
  }

  // Ensure all nets have active field (default true for v1)
  const nets = bundle.nets as Array<Record<string, unknown>>
  for (const net of nets) {
    if (net.active === undefined) {
      net.active = true
    }
  }
}

/**
 * Import a DataBundle into IndexedDB (replace mode: wipes all existing data).
 * Caller should validate the bundle first with validateBundle().
 */
export async function importDataBundle(bundle: DataBundle): Promise<void> {
  // Apply migrations for older bundle versions
  const raw = bundle as unknown as Record<string, unknown>
  if ((raw.version as number) < 2) migrateV1ToV2(raw)

  const db = await getDB()

  // Wipe all stores and reload from bundle in a single transaction
  const tx = db.transaction(
    ['locations', 'nets', 'people', 'banders', 'sessions', 'sessionBanderLogs', 'sessionNetLogs', 'records'],
    'readwrite',
  )

  // Clear all stores
  await Promise.all([
    tx.objectStore('locations').clear(),
    tx.objectStore('nets').clear(),
    tx.objectStore('people').clear(),
    tx.objectStore('banders').clear(),
    tx.objectStore('sessions').clear(),
    tx.objectStore('sessionBanderLogs').clear(),
    tx.objectStore('sessionNetLogs').clear(),
    tx.objectStore('records').clear(),
  ])

  // Load from bundle
  for (const loc of bundle.locations) await tx.objectStore('locations').put(loc)
  for (const net of bundle.nets) await tx.objectStore('nets').put(net)
  for (const person of bundle.people) await tx.objectStore('people').put(person)
  for (const bander of bundle.banders) await tx.objectStore('banders').put(bander)
  for (const session of bundle.sessions) await tx.objectStore('sessions').put(session)
  for (const sbl of (bundle.sessionBanderLogs ?? [])) await tx.objectStore('sessionBanderLogs').put(sbl)
  for (const snl of (bundle.sessionNetLogs ?? [])) await tx.objectStore('sessionNetLogs').put(snl)
  for (const record of bundle.records) await tx.objectStore('records').put(record)

  await tx.done
}

/** Load seed data from public/data/seed.json and import it. */
export async function loadSeedData(): Promise<void> {
  const resp = await fetch(import.meta.env.BASE_URL + 'data/seed.json')
  if (!resp.ok) {
    console.warn('No seed.json found — starting with empty database')
    return
  }
  const data = await resp.json()
  const error = validateBundle(data)
  if (error) {
    console.warn('Invalid seed.json:', error)
    return
  }
  await importDataBundle(data as DataBundle)
}
