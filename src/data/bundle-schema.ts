import type { Location, Net, Person, Bander, Session, BirdRecord } from '../types'

/**
 * JSON Data Bundle schema — single source of truth for the portable backup format.
 * See tech-specifications.md § 6 for versioning rules.
 */

/** Increment when entity fields are added, removed, or renamed. */
export const BUNDLE_VERSION = 1

export interface DataBundle {
  version: number
  exportedAt: string          // ISO 8601 timestamp
  locations: Location[]
  nets: Net[]
  people: Person[]
  banders: Bander[]
  sessions: Session[]
  records: BirdRecord[]
}
