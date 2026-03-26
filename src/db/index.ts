import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { BirdRecord, Session, SessionBanderLog, SessionNetLog, Location, Net, Person, Bander, Band, PhotoRecord } from '../types'
import { loadSeedData } from '../utils/dataBundle'

interface BirdNerdDB extends DBSchema {
  sessions: {
    key: string
    value: Session
    indexes: { 'by-date': string; 'by-location': string }
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
  sessionBanderLogs: {
    key: string
    value: SessionBanderLog
    indexes: { 'by-session': string }
  }
  sessionNetLogs: {
    key: string
    value: SessionNetLog
    indexes: { 'by-session': string }
  }
  bands: {
    key: string
    value: Band
    indexes: { 'by-number': string; 'by-status': string }
  }
  photos: {
    key: string
    value: PhotoRecord
    indexes: { 'by-record': string }
  }
}

let db: IDBPDatabase<BirdNerdDB> | null = null

/** Close and reset the cached DB connection. Used by tests for isolation. */
export function resetDB() {
  if (db) {
    db.close()
    db = null
  }
}

export async function getDB(): Promise<IDBPDatabase<BirdNerdDB>> {
  if (db) return db
  db = await openDB<BirdNerdDB>('birdnerd', 7, {
    upgrade(database, oldVersion, _newVersion, transaction) {
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

      if (oldVersion < 4) {
        // Add by-location index to sessions
        if (database.objectStoreNames.contains('sessions')) {
          const sessionStore = transaction.objectStore('sessions')
          if (!sessionStore.indexNames.contains('by-location')) {
            sessionStore.createIndex('by-location', 'locationId')
          }
        }

        // New store for session bander logs
        const sblStore = database.createObjectStore('sessionBanderLogs', { keyPath: 'id' })
        sblStore.createIndex('by-session', 'sessionId')
      }

      if (oldVersion < 5) {
        // Add sessionNetLogs store
        const snlStore = database.createObjectStore('sessionNetLogs', { keyPath: 'id' })
        snlStore.createIndex('by-session', 'sessionId')

        // Migrate existing nets: add active=true
        if (database.objectStoreNames.contains('nets')) {
          const netStore = transaction.objectStore('nets')
          const req = netStore.openCursor()
          req.then(async (cursor) => {
            let cur = cursor
            while (cur) {
              const net = cur.value as unknown as Record<string, unknown>
              if (net.active === undefined) {
                net.active = true
                cur.update(net as unknown as Net)
              }
              cur = await cur.continue()
            }
          })
        }
      }

      if (oldVersion < 6) {
        const bandStore = database.createObjectStore('bands', { keyPath: 'id' })
        bandStore.createIndex('by-number', 'bandNumber', { unique: true })
        bandStore.createIndex('by-status', 'status')
      }

      if (oldVersion < 7) {
        const photoStore = database.createObjectStore('photos', { keyPath: 'id' })
        photoStore.createIndex('by-record', 'bandingRecordId')
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

export async function getSession(id: string): Promise<Session | undefined> {
  const db = await getDB()
  return db.get('sessions', id)
}

export async function saveSession(session: Session): Promise<void> {
  const db = await getDB()
  await db.put('sessions', session)
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB()
  const records = await db.getAllFromIndex('records', 'by-session', id)
  const banderLogs = await db.getAllFromIndex('sessionBanderLogs', 'by-session', id)
  const netLogs = await db.getAllFromIndex('sessionNetLogs', 'by-session', id)
  // Gather all photos for all records in this session
  const allPhotos: PhotoRecord[] = []
  for (const r of records) {
    const photos = await db.getAllFromIndex('photos', 'by-record', r.id)
    allPhotos.push(...photos)
  }
  const tx = db.transaction(['sessions', 'records', 'sessionBanderLogs', 'sessionNetLogs', 'photos'], 'readwrite')
  for (const p of allPhotos) await tx.objectStore('photos').delete(p.id)
  for (const r of records) await tx.objectStore('records').delete(r.id)
  for (const bl of banderLogs) await tx.objectStore('sessionBanderLogs').delete(bl.id)
  for (const nl of netLogs) await tx.objectStore('sessionNetLogs').delete(nl.id)
  await tx.objectStore('sessions').delete(id)
  await tx.done
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
  const photos = await db.getAllFromIndex('photos', 'by-record', id)
  const tx = db.transaction(['records', 'photos'], 'readwrite')
  for (const p of photos) await tx.objectStore('photos').delete(p.id)
  await tx.objectStore('records').delete(id)
  await tx.done
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

// Session Bander Logs
export async function getSessionBanderLogs(sessionId: string): Promise<SessionBanderLog[]> {
  const db = await getDB()
  return db.getAllFromIndex('sessionBanderLogs', 'by-session', sessionId)
}

export async function getAllSessionBanderLogs(): Promise<SessionBanderLog[]> {
  const db = await getDB()
  return db.getAll('sessionBanderLogs')
}

export async function saveSessionBanderLog(log: SessionBanderLog): Promise<void> {
  const db = await getDB()
  await db.put('sessionBanderLogs', log)
}

export async function deleteSessionBanderLog(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('sessionBanderLogs', id)
}

export async function replaceSessionBanderLogs(sessionId: string, banderIds: string[]): Promise<void> {
  const db = await getDB()
  const existing = await db.getAllFromIndex('sessionBanderLogs', 'by-session', sessionId)
  const tx = db.transaction('sessionBanderLogs', 'readwrite')
  for (const log of existing) await tx.store.delete(log.id)
  const now = new Date().toISOString()
  for (const banderId of banderIds) {
    await tx.store.put({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      sessionId,
      banderId,
      createdAt: now,
      updatedAt: now,
    })
  }
  await tx.done
}

// Session Net Logs
export async function getSessionNetLogs(sessionId: string): Promise<SessionNetLog[]> {
  const db = await getDB()
  return db.getAllFromIndex('sessionNetLogs', 'by-session', sessionId)
}

export async function getAllSessionNetLogs(): Promise<SessionNetLog[]> {
  const db = await getDB()
  return db.getAll('sessionNetLogs')
}

export async function saveSessionNetLog(log: SessionNetLog): Promise<void> {
  const db = await getDB()
  await db.put('sessionNetLogs', log)
}

export async function deleteSessionNetLog(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('sessionNetLogs', id)
}

/** Auto-generate net logs for all active nets at a location, pre-filled with session times */
export async function generateSessionNetLogs(
  sessionId: string,
  locationId: string,
  openTime?: string,
  closeTime?: string,
): Promise<SessionNetLog[]> {
  const db = await getDB()
  const allNets = await db.getAllFromIndex('nets', 'by-location', locationId)
  const activeNets = allNets.filter(n => n.active !== false)
  const now = new Date().toISOString()
  const logs: SessionNetLog[] = activeNets.map(net => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${net.id}`,
    sessionId,
    netId: net.id,
    openTime,
    closeTime,
    createdAt: now,
    updatedAt: now,
  }))
  const tx = db.transaction('sessionNetLogs', 'readwrite')
  for (const log of logs) await tx.store.put(log)
  await tx.done
  return logs
}

/** Get active nets for a location */
export async function getActiveNetsByLocation(locationId: string): Promise<Net[]> {
  const db = await getDB()
  const allNets = await db.getAllFromIndex('nets', 'by-location', locationId)
  return allNets.filter(n => n.active !== false)
}

// Bands
export async function getBands(): Promise<Band[]> {
  const db = await getDB()
  return db.getAll('bands')
}

export async function getBand(id: string): Promise<Band | undefined> {
  const db = await getDB()
  return db.get('bands', id)
}

export async function getBandByNumber(bandNumber: string): Promise<Band | undefined> {
  const db = await getDB()
  return db.getFromIndex('bands', 'by-number', bandNumber)
}

export async function getBandsByStatus(status: string): Promise<Band[]> {
  const db = await getDB()
  return db.getAllFromIndex('bands', 'by-status', status)
}

export async function saveBand(band: Band): Promise<void> {
  const db = await getDB()
  await db.put('bands', band)
}

export async function saveBands(bands: Band[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('bands', 'readwrite')
  for (const band of bands) await tx.store.put(band)
  await tx.done
}

export async function deleteBand(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('bands', id)
}

/** Save a banding record and optionally update the associated band in one transaction */
export async function saveRecordWithBandUpdate(
  record: BirdRecord,
  bandUpdate?: Band,
): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['records', 'bands'], 'readwrite')
  await tx.objectStore('records').put(record)
  if (bandUpdate) {
    await tx.objectStore('bands').put(bandUpdate)
  }
  await tx.done
}

// Photos
export async function getPhotosByRecord(recordId: string): Promise<PhotoRecord[]> {
  const db = await getDB()
  return db.getAllFromIndex('photos', 'by-record', recordId)
}

export async function savePhoto(photo: PhotoRecord): Promise<void> {
  const db = await getDB()
  await db.put('photos', photo)
}

export async function deletePhoto(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('photos', id)
}
