import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { BirdRecord, Session, Location, Net, Person, Bander } from '../types'
import { loadSeedData } from '../utils/dataBundle'

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
  people: {
    key: string
    value: Person
    indexes: { 'by-initials': string }
  }
  banders: {
    key: string
    value: Bander
    indexes: { 'by-person': string }
  }
}

let db: IDBPDatabase<BirdNerdDB> | null = null

export async function getDB(): Promise<IDBPDatabase<BirdNerdDB>> {
  if (db) return db
  db = await openDB<BirdNerdDB>('birdnerd', 3, {
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

      if (oldVersion < 3) {
        const peopleStore = database.createObjectStore('people', { keyPath: 'id' })
        peopleStore.createIndex('by-initials', 'initials')

        const banderStore = database.createObjectStore('banders', { keyPath: 'id' })
        banderStore.createIndex('by-person', 'personId')
      }
    },
  })

  // Seed from seed.json on first launch (all stores empty)
  const counts = await Promise.all([
    db.count('locations'),
    db.count('people'),
    db.count('sessions'),
  ])
  const isEmpty = counts.every(c => c === 0)
  if (isEmpty) {
    await loadSeedData()
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

// People
export async function getPeople(): Promise<Person[]> {
  const db = await getDB()
  return db.getAll('people')
}

export async function getPerson(id: string): Promise<Person | undefined> {
  const db = await getDB()
  return db.get('people', id)
}

export async function savePerson(person: Person): Promise<void> {
  const db = await getDB()
  await db.put('people', person)
}

export async function deletePerson(id: string): Promise<void> {
  const db = await getDB()
  // Also delete associated bander record
  const banders = await db.getAllFromIndex('banders', 'by-person', id)
  const tx = db.transaction(['people', 'banders'], 'readwrite')
  for (const bander of banders) {
    await tx.objectStore('banders').delete(bander.id)
  }
  await tx.objectStore('people').delete(id)
  await tx.done
}

// Banders
export async function getBanders(): Promise<Bander[]> {
  const db = await getDB()
  return db.getAll('banders')
}

export async function getBanderByPerson(personId: string): Promise<Bander | undefined> {
  const db = await getDB()
  const banders = await db.getAllFromIndex('banders', 'by-person', personId)
  return banders[0]
}

export async function saveBander(bander: Bander): Promise<void> {
  const db = await getDB()
  await db.put('banders', bander)
}

export async function deleteBander(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('banders', id)
}
