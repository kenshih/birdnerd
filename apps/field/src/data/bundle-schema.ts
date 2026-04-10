import type { Location, Net, Person, Bander, Session, SessionBanderLog, SessionNetLog, BirdRecord, Band } from '@birdnerd/shared'

/** Photo metadata for bundle export (blob excluded — photos stored externally) */
export interface PhotoRecordExport {
  id: string
  bandingRecordId: string
  bodyPart: string
  fileName: string
  createdAt: string
  updatedAt: string
}

/**
 * JSON Data Bundle schema — single source of truth for the portable backup format.
 * See tech-specifications.md § 6 for versioning rules.
 *
 * Version history:
 *   v1 — Initial: locations, nets, people, banders, sessions (station field), records
 *   v2 — Session.station → Session.locationId + new session fields
 *         (protocol, mapsPeriod, masterBanderId, openTime, closeTime, notes, updatedAt)
 *         Added sessionBanderLogs array
 *         Added sessionNetLogs array
 *         Added weather fields to Session (weatherOpen/Close Temp/Wind/Cloud/Precip)
 *         Added Net.active field (soft-delete)
 *   v3 — Added bands array (Band entity)
 *         Added BirdRecord.bandId FK
 *   v4 — Added photos array (PhotoRecord metadata, no blobs)
 */

/** Increment when entity fields are added, removed, or renamed. */
export const BUNDLE_VERSION = 4

export interface DataBundle {
  version: number
  exportedAt: string          // ISO 8601 timestamp
  locations: Location[]
  nets: Net[]
  people: Person[]
  banders: Bander[]
  sessions: Session[]
  sessionBanderLogs: SessionBanderLog[]
  sessionNetLogs: SessionNetLog[]
  bands: Band[]
  records: BirdRecord[]
  photos: PhotoRecordExport[]
}
