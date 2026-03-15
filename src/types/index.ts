export interface Species {
  code: string       // 4-letter alpha code e.g. "SOSP"
  commonName: string // e.g. "Song Sparrow"
}

export interface BirdRecord {
  id: string
  sessionId: string
  bandNumber?: string
  speciesCode?: string
  age?: string
  sex?: string
  howAged?: string
  howSexed?: string
  bbpCode?: string
  skull?: string
  cp?: string
  bp?: string
  fat?: string
  bodyMolt?: string
  ffMolt?: string
  tfMolt?: string
  ffWear?: string
  moltLimitsPlumage?: string
  wing?: number
  bodyMass?: number
  status?: string
  captureTime?: string
  date?: string
  station?: string
  net?: string
  bander?: string
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
