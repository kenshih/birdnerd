export interface Species {
  code: string       // 4-letter alpha code e.g. "SOSP"
  commonName: string // e.g. "Song Sparrow"
  sciName: string    // e.g. "Melospiza melodia"
}

export interface BirdRecord {
  id: string
  sessionId: string
  // Identity
  bandNumber?: string
  speciesCode?: string
  age?: string
  sex?: string
  howAged?: string
  howAged2?: string
  howSexed?: string
  howSexed2?: string
  bbpCode?: string      // capture status code
  wrp?: string           // WRP molt cycle code
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

export interface Session {
  id: string
  station: string
  date: string       // ISO date string "YYYY-MM-DD"
  createdAt: string
}
