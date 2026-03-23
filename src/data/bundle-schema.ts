import type { Location, Net, Person, Bander, Session, SessionBanderLog, BirdRecord } from '../types'

/**
 * JSON Data Bundle schema — single source of truth for the portable backup format.
 * See tech-specifications.md § 6 for versioning rules.
 *
 * Version history:
 *   v1 — Initial: locations, nets, people, banders, sessions (station field), records
 *   v2 — Session.station → Session.locationId + new session fields
 *         (protocol, mapsPeriod, masterBanderId, openTime, closeTime, notes, updatedAt)
 *         Added sessionBanderLogs array
 */

/** Increment when entity fields are added, removed, or renamed. */
export const BUNDLE_VERSION = 2

export interface DataBundle {
  version: number
  exportedAt: string          // ISO 8601 timestamp
  locations: Location[]
  nets: Net[]
  people: Person[]
  banders: Bander[]
  sessions: Session[]
  sessionBanderLogs: SessionBanderLog[]
  records: BirdRecord[]
}
