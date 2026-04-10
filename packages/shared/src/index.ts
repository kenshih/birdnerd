export interface Species {
  code: string       // 4-letter alpha code e.g. "SOSP"
  commonName: string // e.g. "Song Sparrow"
  sciName: string    // e.g. "Melospiza melodia"
}

export interface PhotoRecord {
  id: string
  bandingRecordId: string    // FK to BirdRecord
  bodyPart: string           // WING, TAIL, HEAD, BODY, BAND, or free text
  fileName: string           // auto-generated filename for external storage
  blob: Blob                 // the actual image data (stored in IndexedDB, not exported)
  createdAt: string
  updatedAt: string
}

export type BandStatus = 'available' | 'deployed' | 'foreign' | 'destroyed' | 'lost' | 'replaced'
export type BandType = 'Standard' | 'Buffy' | 'Giant' | 'Lockout'

export interface Band {
  id: string
  bandNumber: string        // XXXX-XXXXX, unique per physical band
  status: BandStatus
  bandSize: string          // BBL size code (0, 0A, 0B, 1, 1A, 1B, 1C, 1D, 2, 3, 3A, 3B, 4, 7, 7A, 7B, 8, 9)
  bandType: BandType
  currentSpecies?: string   // ALPHA code when deployed
  deploymentDate?: string   // ISO date when deployed
  createdAt: string
  updatedAt: string
}

export interface BirdRecord {
  id: string
  sessionId: string
  // Identity
  bandId?: string           // FK to Band (null for UNBANDED)
  bandNumber?: string
  speciesCode?: string
  age?: string
  sex?: string
  howAged?: string
  howAged2?: string
  howSexed?: string
  howSexed2?: string
  bbpCode?: string          // capture status code
  wrp?: string              // WRP molt cycle code
  // Condition
  skull?: string
  cp?: string
  bp?: string
  fat?: string
  bodyMolt?: string
  ffMolt?: string
  tfMolt?: string
  ffWear?: string
  juvBodyPlumage?: string
  // Molt Limits (per feather tract)
  moltLimitsPCovs?: string
  moltLimitsSCovs?: string
  moltLimitsPP?: string
  moltLimitsSS?: string
  moltLimitsTert?: string
  moltLimitsRec?: string
  moltLimitsBodyPlum?: string
  moltLimitsNonFeather?: string
  moltLimitsPlumage?: string  // legacy free-text field
  // Morphometrics
  wing?: number
  tail?: number
  tarsus?: number
  exposedCulmen?: number
  otherMeasurement?: number
  bodyMass?: number
  // Recapture (only saved when bbpCode = R)
  presentCondition?: string
  replacedBandNumber?: string
  // Status & Disposition
  status?: string
  disposition?: string
  // Logistics
  captureTime?: string
  releaseTime?: string
  date?: string
  station?: string
  net?: string
  bander?: string
  // Additional
  featherPull?: boolean
  bloodSample?: boolean
  notes?: string
  createdAt: string
  updatedAt: string
}

export type Protocol = 'MAPS' | 'Non-MAPS' | 'Burrowing Owl' | 'Rehabbed-Bird' | 'Saw-whet Owl'

export interface Session {
  id: string
  locationId: string           // FK to Location
  date: string                 // ISO date string "YYYY-MM-DD"
  protocol?: Protocol
  mapsPeriod?: number          // 1-10, only when protocol=MAPS
  masterBanderId?: string      // FK to Bander
  openTime?: string            // HH:mm
  closeTime?: string           // HH:mm
  // Weather @ Open
  weatherOpenTemp?: number     // °C
  weatherOpenWind?: number     // Beaufort 0-12
  weatherOpenCloud?: number    // 0-100%
  weatherOpenPrecip?: string   // free text or suggestion
  // Weather @ Close
  weatherCloseTemp?: number
  weatherCloseWind?: number
  weatherCloseCloud?: number
  weatherClosePrecip?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface SessionBanderLog {
  id: string
  sessionId: string            // FK to Session
  banderId: string             // FK to Bander
  createdAt: string
  updatedAt: string
}

export interface Location {
  id: string
  banderLocationId: string     // 4-letter code e.g. "GCBS"
  bblLocationId: string | null // 6-letter BBL code, nullable until registered
  name: string
  latitude: number
  longitude: number
  country: string
  stateProvince: string
  remarks: string
  createdAt: string
  updatedAt: string
}

export interface Net {
  id: string
  locationId: string           // FK to Location
  label: string                // e.g. "1", "N-01", "Trap-A"
  active: boolean              // soft-delete: false = removed from operation
  createdAt: string
  updatedAt: string
}

export interface SessionNetLog {
  id: string
  sessionId: string            // FK to Session
  netId: string                // FK to Net
  openTime?: string            // HH:mm — defaults to session open time
  closeTime?: string           // HH:mm — defaults to session close time
  remarks?: string
  createdAt: string
  updatedAt: string
}

export interface Person {
  id: string
  name: string
  initials: string             // 2-3 letter code e.g. "HD"
  active: boolean
  createdAt: string
  updatedAt: string
}

export type BanderRole = 'Master Bander' | 'Sub-permittee' | 'Bander' | 'Trainee'

export interface Bander {
  id: string
  personId: string             // FK to Person
  role: BanderRole
  createdAt: string
  updatedAt: string
}
