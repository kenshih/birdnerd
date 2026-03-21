import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { BirdRecord, Session, Location, Net } from '../types'
import { SEED_LOCATIONS, SEED_NETS } from '../data/seed'

interface BirdNerdDB extends DBSchema {
  sessions: {
    key: string
    value: Session
    indexes: { 'by-date': string }
  }
  records: {
    key: string
    value: BirdRecord
    indexes: { 'by-session': string }
  }
  locations: {
    key: string
    value: Location
    indexes: { 'by-bander-id': string }
  }
  nets: {
    key: string
    value: Net
    indexes: { 'by-location': string }
  }
}

let db: IDBPDatabase<BirdNerdDB> | null = null

export async function getDB(): Promise<IDBPDatabase<BirdNerdDB>> {
  if (db) return db
  db = await openDB<BirdNerdDB>('birdnerd', 2, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        const sessionStore = database.createObjectStore('sessions', { keyPath: 'id' })
        sessionStore.createIndex('by-date', 'date')

        const recordStore = database.createObjectStore('records', { keyPath: 'id' })
        recordStore.createIndex('by-session', 'sessionId')
      }

      if (oldVersion < 2) {
        const locationStore = database.createObjectStore('locations', { keyPath: 'id' })
        locationStore.createIndex('by-bander-id', 'banderLocationId')

        const netStore = database.createObjectStore('nets', { keyPath: 'id' })
        netStore.createIndex('by-location', 'locationId')
      }
    },
  })

  // Seed locations and nets if empty
  const existingLocations = await db.count('locations')
  if (existingLocations === 0 && SEED_LOCATIONS.length > 0) {
    const now = new Date().toISOString()
    const tx = db.transaction(['locations', 'nets'], 'readwrite')
    for (const loc of SEED_LOCATIONS) {
      await tx.objectStore('locations').put({ ...loc, createdAt: now, updatedAt: now })
    }
    for (const net of SEED_NETS) {
      await tx.objectStore('nets').put({ ...net, createdAt: now, updatedAt: now })
    }
    await tx.done
  }

  return db
}

// Sessions
export async function getSessions(): Promise<Session[]> {
  const db = await getDB()
  return db.getAllFromIndex('sessions', 'by-date')
}

export async function saveSession(session: Session): Promise<void> {
  const db = await getDB()
  await db.put('sessions', session)
}

// Records
export async function getRecordsBySession(sessionId: string): Promise<BirdRecord[]> {
  const db = await getDB()
  return db.getAllFromIndex('records', 'by-session', sessionId)
}

export async function saveRecord(record: BirdRecord): Promise<void> {
  const db = await getDB()
  await db.put('records', record)
}

export async function deleteRecord(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('records', id)
}

// Locations
export async function getLocations(): Promise<Location[]> {
  const db = await getDB()
  return db.getAll('locations')
}

export async function getLocation(id: string): Promise<Location | undefined> {
  const db = await getDB()
  return db.get('locations', id)
}

export async function saveLocation(location: Location): Promise<void> {
  const db = await getDB()
  await db.put('locations', location)
}

export async function deleteLocation(id: string): Promise<void> {
  const db = await getDB()
  // Also delete associated nets
  const nets = await db.getAllFromIndex('nets', 'by-location', id)
  const tx = db.transaction(['locations', 'nets'], 'readwrite')
  for (const net of nets) {
    await tx.objectStore('nets').delete(net.id)
  }
  await tx.objectStore('locations').delete(id)
  await tx.done
}

// Nets
export async function getNetsByLocation(locationId: string): Promise<Net[]> {
  const db = await getDB()
  return db.getAllFromIndex('nets', 'by-location', locationId)
}

export async function saveNet(net: Net): Promise<void> {
  const db = await getDB()
  await db.put('nets', net)
}

export async function deleteNet(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('nets', id)
}
