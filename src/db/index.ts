import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { BirdRecord, Session } from '../types'

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
}

let db: IDBPDatabase<BirdNerdDB> | null = null

export async function getDB(): Promise<IDBPDatabase<BirdNerdDB>> {
  if (db) return db
  db = await openDB<BirdNerdDB>('birdnerd', 1, {
    upgrade(database) {
      const sessionStore = database.createObjectStore('sessions', { keyPath: 'id' })
      sessionStore.createIndex('by-date', 'date')

      const recordStore = database.createObjectStore('records', { keyPath: 'id' })
      recordStore.createIndex('by-session', 'sessionId')
    },
  })
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
