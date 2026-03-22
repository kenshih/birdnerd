import { BUNDLE_VERSION, type DataBundle } from '../data/bundle-schema'
import { getDB } from '../db'

/** Export all managed data as a DataBundle object. */
export async function exportDataBundle(): Promise<DataBundle> {
  const db = await getDB()
  const [locations, nets, people, banders, sessions, records] = await Promise.all([
    db.getAll('locations'),
    db.getAll('nets'),
    db.getAll('people'),
    db.getAll('banders'),
    db.getAll('sessions'),
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

  return null
}

/**
 * Import a DataBundle into IndexedDB (replace mode: wipes all existing data).
 * Caller should validate the bundle first with validateBundle().
 */
export async function importDataBundle(bundle: DataBundle): Promise<void> {
  const db = await getDB()

  // Wipe all stores and reload from bundle in a single transaction
  const tx = db.transaction(
    ['locations', 'nets', 'people', 'banders', 'sessions', 'records'],
    'readwrite',
  )

  // Clear all stores
  await Promise.all([
    tx.objectStore('locations').clear(),
    tx.objectStore('nets').clear(),
    tx.objectStore('people').clear(),
    tx.objectStore('banders').clear(),
    tx.objectStore('sessions').clear(),
    tx.objectStore('records').clear(),
  ])

  // Load from bundle
  for (const loc of bundle.locations) await tx.objectStore('locations').put(loc)
  for (const net of bundle.nets) await tx.objectStore('nets').put(net)
  for (const person of bundle.people) await tx.objectStore('people').put(person)
  for (const bander of bundle.banders) await tx.objectStore('banders').put(bander)
  for (const session of bundle.sessions) await tx.objectStore('sessions').put(session)
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
