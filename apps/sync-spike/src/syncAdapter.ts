import * as Y from 'yjs'
import type { BirdRecord } from '@birdnerd/shared'

const RECORDS_KEY = 'records'

export function getRecordsMap(doc: Y.Doc): Y.Map<Y.Map<unknown>> {
  return doc.getMap(RECORDS_KEY) as Y.Map<Y.Map<unknown>>
}

export function yMapToRecord(ymap: Y.Map<unknown>): BirdRecord {
  return Object.fromEntries(ymap.entries()) as unknown as BirdRecord
}

export function getAllRecords(doc: Y.Doc): BirdRecord[] {
  const map = getRecordsMap(doc)
  const records: BirdRecord[] = []
  map.forEach(ymap => {
    records.push(yMapToRecord(ymap))
  })
  return records
}

export function addRecord(doc: Y.Doc, record: BirdRecord): void {
  const map = getRecordsMap(doc)
  const ymap = new Y.Map<unknown>()
  doc.transact(() => {
    for (const [key, value] of Object.entries(record)) {
      if (value !== undefined) {
        ymap.set(key, value)
      }
    }
    map.set(record.id, ymap)
  })
}

export function updateRecordField(
  doc: Y.Doc,
  id: string,
  field: string,
  value: unknown,
): void {
  const map = getRecordsMap(doc)
  const ymap = map.get(id)
  if (!ymap) return
  doc.transact(() => {
    if (value === undefined || value === '') {
      ymap.delete(field)
    } else {
      ymap.set(field, value)
    }
  })
}

export function deleteRecord(doc: Y.Doc, id: string): void {
  const map = getRecordsMap(doc)
  doc.transact(() => {
    map.delete(id)
  })
}
