import type { BirdRecord } from '@birdnerd/shared'
import type { OperationalEntity, OperationalProjection } from '@birdnerd/banding'
import { isNewBanding, isRecapture } from '../data/codes'
import { SPECIES_LIST } from '../data/species'

// ── Code Mappings ──────────────────────────────────────────────────

// Resolve a record's ALPHA species code → common name for the master export.
const COMMON_NAME_BY_CODE = new Map(SPECIES_LIST.map(s => [s.code, s.commonName]))

// How Aged: app stores BBL 2-letter → IBP single-letter for MASTER export
const HOW_AGED_BBL_TO_IBP: Record<string, string> = {
  'CL': 'C', 'SK': 'S', 'PL': 'P', 'FF': 'F', 'LP': 'L',
  'MB': 'I', 'MR': 'M', 'OT': 'O', 'BP': 'BP', 'CC': 'CC',
  'EG': 'EG', 'EY': 'EY', 'FB': 'FB', 'IC': 'IC', 'NA': 'NA',
  'NF': 'NF', 'NL': 'NL', 'NN': 'NN', 'RC': 'RC',
}

// How Sexed: app stores BBL 2-letter → IBP single-letter for MASTER export
const HOW_SEXED_BBL_TO_IBP: Record<string, string> = {
  'BP': 'B', 'CL': 'C', 'PL': 'P', 'EY': 'E', 'CC': 'CC',
  'EG': 'EG', 'MB': 'MB', 'NA': 'NA', 'TL': 'TL', 'WL': 'WL', 'OT': 'OT',
}

// Capture Code: our codes are a mix of IBP/BBL (1, U, R, F, 4, 5, 6, 8, X)
// IBP uses letters (N, U, R, F, D, etc.), BBL uses numbers (1, U, R, F, 4, 5, 6, 8, X)
// Our app stores the BBL version already
const CAPTURE_CODE_TO_IBP: Record<string, string> = {
  '1': 'N', 'N': 'N', '4': 'D', '5': '5', '6': '6', '8': 'L',
  'U': 'U', 'R': 'R', 'F': 'F', 'X': 'X',
  // Band-fate markers are already IBP letters — pass through unchanged.
  'D': 'D', 'L': 'L',
}

// Band-fate capture codes (IBP letters) → the BBL numeric for the "Code BBL" column,
// and → the Species Name marker the master sheet uses. Inverse of the importer's
// band-event handling. See docs/apps/field/research-destroyed-bands.md.
const BAND_FATE_TO_BBL: Record<string, string> = { D: '4', L: '8' }
const BAND_FATE_SPECIES_NAME: Record<string, string> = {
  D: 'BAND DESTROYED',
  L: 'BAND LOST',
}

// Age: our app stores numeric BBL codes → alpha for display
const AGE_NUM_TO_ALPHA: Record<string, string> = {
  '1': 'AHY', '2': 'HY', '4': 'L', '5': 'SY',
  '6': 'ASY', '7': 'TY', '8': 'ATY', 'U': 'U',
}

// Station defaults — MAPS protocol assumes mist-net capture on the right leg.
// Hoisted so they read as policy defaults, not magic strings (and become a
// single edit point if capture method / leg ever become per-record fields).
const DEFAULT_CAPTURE_METHOD = 'Mist net'
const DEFAULT_BANDED_LEG = 'R'

// Body Molt: IBP numeric 0-4 → BBL Y/N
function bodyMoltToBBL(ibp: string | undefined): string {
  if (!ibp) return ''
  return ibp === '0' ? 'N' : 'Y'
}

// FF Molt: IBP letter → BBL Y/N
function ffMoltToBBL(ibp: string | undefined): string {
  if (!ibp) return ''
  return ibp === 'N' || ibp === '0' ? 'N' : 'Y'
}

// Feather Pull / Blood Sample: boolean → Y/N
function boolToYN(val: boolean | undefined): string {
  return val ? 'Y' : 'N'
}

// Band number: strip hyphen for numeric export (XXXX-XXXXX → XXXXXXXXX)
function bandNumberRaw(bn: string | undefined): string {
  if (!bn || bn === 'UNBANDED') return ''
  return bn.replace(/-/g, '')
}

// Capture time: "07:10" → "710" (strip colon, no leading zero)
function captureTimeToNum(time: string | undefined): string {
  if (!time) return ''
  return String(parseInt(time.replace(':', ''), 10))
}

// Numeric measurement → string, blank when absent (avoids "0" for missing values)
function num(n: number | undefined): string {
  return n != null ? String(n) : ''
}

// Split a record's date (falling back to its session) into the agency export's
// year / month / day columns — month & day with no leading zero.
function dateParts(rec: AgencyRecord, session: ExportSession | undefined): { year: string; month: string; day: string } {
  const [year, month, day] = (rec.date ?? session?.date ?? '').split('-')
  const noZero = (v: string | undefined) => (v ? String(parseInt(v, 10)) : '')
  return { year: year ?? '', month: noZero(month), day: noZero(day) }
}

// ── Lookup helpers ─────────────────────────────────────────────────

interface ExportSession { id: string; locationId: string; date?: string }
interface ExportLocation { id: string; banderLocationId?: string }
interface ExportBand { id: string; bandSize?: string }
interface ExportPerson { id: string; initials?: string }
interface ExportBander { id: string; personId: string }

interface ExportContext {
  sessions: ExportSession[]
  locations: ExportLocation[]
  bands: ExportBand[]
  people: ExportPerson[]
  banders: ExportBander[]
}

type AgencyRecord = Pick<BirdRecord,
  'sessionId' | 'bandId' | 'bandNumber' | 'speciesCode' | 'age' | 'howAged' | 'howAged2' | 'wrp' | 'sex' | 'howSexed' | 'howSexed2'
  | 'skull' | 'cp' | 'bp' | 'fat' | 'bodyMolt' | 'ffMolt' | 'ffWear' | 'juvBodyPlumage'
  | 'moltLimitsPCovs' | 'moltLimitsSCovs' | 'moltLimitsPP' | 'moltLimitsSS' | 'moltLimitsTert' | 'moltLimitsRec' | 'moltLimitsBodyPlum' | 'moltLimitsNonFeather'
  | 'wing' | 'tail' | 'tarsus' | 'exposedCulmen' | 'bodyMass' | 'status' | 'date' | 'captureTime' | 'station' | 'net'
  | 'disposition' | 'notes' | 'featherPull' | 'bloodSample' | 'bbpCode' | 'replacedBandNumber' | 'presentCondition' | 'bander'
>

/**
 * Pre-indexed view of an ExportContext. Built once per export so row builders
 * resolve FKs via O(1) Map lookups instead of an O(records × entities) linear
 * `.find()` scan per record (a multi-season export can be thousands of rows).
 */
interface IndexedContext {
  sessionById: Map<string, ExportSession>
  locationById: Map<string, ExportLocation>
  bandById: Map<string, ExportBand>
  initialsByBander: Map<string, string>
}

function indexContext(ctx: ExportContext): IndexedContext {
  const personById = new Map(ctx.people.map((p): [string, ExportPerson] => [p.id, p]))
  return {
    sessionById: new Map(ctx.sessions.map((s): [string, ExportSession] => [s.id, s])),
    locationById: new Map(ctx.locations.map((l): [string, ExportLocation] => [l.id, l])),
    bandById: new Map(ctx.bands.map((b): [string, ExportBand] => [b.id, b])),
    initialsByBander: new Map(
      ctx.banders.map((b): [string, string] => [b.id, personById.get(b.personId)?.initials ?? '']),
    ),
  }
}

function banderInitials(idx: IndexedContext, banderField: string | undefined): string {
  if (!banderField) return ''
  // banderField might be a bander ID or already-initials; fall back to itself.
  return idx.initialsByBander.get(banderField) ?? banderField
}

// ── IBP (MASTER) Format Export ─────────────────────────────────────

const IBP_HEADERS = [
  'Bander', 'Code IBP', 'Code BBL', 'Band Size', 'Band Number',
  'Species Name', 'ALPHA Code',
  'Age NUMBER', 'Age',
  'How Aged IBP', 'How Aged BBL', 'How Aged IBP 2',
  'WRP',
  'Sex', 'How Sexed IBP', 'How Sexed BBL', 'How Sexed IBP 2',
  'Skull', 'Cloacal Protuberance', 'Brood Patch', 'Fat',
  'Body Molt IBP', 'Body Molt BBL',
  'FF Molt IBP', 'FF Molt BBL',
  'Flight Feather Wear', 'Juv. Body Plumage',
  'P covs', 'S covs', 'PP', 'SS', 'Tert', 'Rec', 'Body Plum', 'Non-Feath',
  'Wing', 'Body Mass',
  'Status',
  'Month', 'Day', 'Year',
  'Capture Time',
  'Station', 'Net',
  'Disposition',
  'Note',
  'Feather Pull', 'Feather Pull BBL', 'Blood Sample BBL',
]

function recordToIBPRow(rec: AgencyRecord, idx: IndexedContext): string[] {
  const session = idx.sessionById.get(rec.sessionId)
  const location = session ? idx.locationById.get(session.locationId) : undefined
  const band = rec.bandId ? idx.bandById.get(rec.bandId) : undefined
  const { year, month, day } = dateParts(rec, session)

  return [
    banderInitials(idx, rec.bander),                                // Bander
    CAPTURE_CODE_TO_IBP[rec.bbpCode ?? ''] ?? rec.bbpCode ?? '',    // Code IBP
    BAND_FATE_TO_BBL[rec.bbpCode ?? ''] ?? rec.bbpCode ?? '',        // Code BBL (band fate D/L → 4/8)
    band?.bandSize ?? '',                                            // Band Size
    bandNumberRaw(rec.bandNumber),                                   // Band Number
    BAND_FATE_SPECIES_NAME[rec.bbpCode ?? '']                        // Species Name: band-fate marker, else
      ?? COMMON_NAME_BY_CODE.get(rec.speciesCode ?? '') ?? '',       //   common name resolved from the ALPHA code
    rec.speciesCode ?? '',                                          // ALPHA Code
    rec.age ?? '',                                                   // Age NUMBER
    AGE_NUM_TO_ALPHA[rec.age ?? ''] ?? rec.age ?? '',                // Age (alpha)
    HOW_AGED_BBL_TO_IBP[rec.howAged ?? ''] ?? rec.howAged ?? '',     // How Aged IBP
    rec.howAged ?? '',                                               // How Aged BBL
    HOW_AGED_BBL_TO_IBP[rec.howAged2 ?? ''] ?? rec.howAged2 ?? '',   // How Aged IBP 2
    rec.wrp ?? '',                                                   // WRP
    rec.sex ?? '',                                                   // Sex
    HOW_SEXED_BBL_TO_IBP[rec.howSexed ?? ''] ?? rec.howSexed ?? '',  // How Sexed IBP
    rec.howSexed ?? '',                                              // How Sexed BBL
    HOW_SEXED_BBL_TO_IBP[rec.howSexed2 ?? ''] ?? rec.howSexed2 ?? '', // How Sexed IBP 2
    rec.skull ?? '',                                                 // Skull
    rec.cp ?? '',                                                    // Cloacal Protuberance
    rec.bp ?? '',                                                    // Brood Patch
    rec.fat ?? '',                                                   // Fat
    rec.bodyMolt ?? '',                                              // Body Molt IBP
    bodyMoltToBBL(rec.bodyMolt),                                     // Body Molt BBL
    rec.ffMolt ?? '',                                                // FF Molt IBP
    ffMoltToBBL(rec.ffMolt),                                         // FF Molt BBL
    rec.ffWear ?? '',                                                // Flight Feather Wear
    rec.juvBodyPlumage ?? '',                                        // Juv. Body Plumage
    rec.moltLimitsPCovs ?? '',                                       // P covs
    rec.moltLimitsSCovs ?? '',                                       // S covs
    rec.moltLimitsPP ?? '',                                          // PP
    rec.moltLimitsSS ?? '',                                          // SS
    rec.moltLimitsTert ?? '',                                        // Tert
    rec.moltLimitsRec ?? '',                                         // Rec
    rec.moltLimitsBodyPlum ?? '',                                    // Body Plum
    rec.moltLimitsNonFeather ?? '',                                  // Non-Feath
    num(rec.wing),                                                   // Wing
    num(rec.bodyMass),                                               // Body Mass
    rec.status ?? '',                                                // Status
    month,                                                           // Month (no leading zero)
    day,                                                             // Day (no leading zero)
    year,                                                            // Year
    captureTimeToNum(rec.captureTime),                               // Capture Time
    location?.banderLocationId ?? rec.station ?? '',                 // Station
    rec.net ?? '',                                                   // Net
    rec.disposition ?? '',                                           // Disposition
    rec.notes ?? '',                                                 // Note
    boolToYN(rec.featherPull),                                       // Feather Pull
    boolToYN(rec.featherPull),                                       // Feather Pull BBL
    boolToYN(rec.bloodSample),                                       // Blood Sample BBL
  ]
}

// ── BBL Upload Format (New Bandings) ──────────────────────────────


const BBL_HEADERS = [
  'Band Number', 'Species', 'Disposition',
  'Banding Year', 'Banding Month', 'Banding Day',
  'Age', 'How Aged', 'Sex', 'How Sexed',
  'Bird Status', 'Location', 'Remarks',
  'Replaced Band Number', 'Reward Band Number',
  'Bander ID', 'Scribe',
  'How Captured', 'Capture Time Enter or Paste Here', 'Capture Time',
  'Banded Leg',
  'Wing Chord', 'Tail Length', 'Tarsus Length', 'Culmen Length',
  'Bill Length', 'Bill Width', 'Bill Height',
  'Bird Weight', 'Weight Time Enter or Paste Here', 'Weight Time',
  'Eye color', 'Fat Score', 'Skull', 'Brood Patch', 'Cloacal Protuberance',
  'Body Molt', 'Flight Feather Molt', 'Molt Cycle Code',
  'Net Nest Cavity Designator', 'Net Nest Cavity Number',
  'Plot ID', 'Sweep Number', 'Nest Location',
  'Blood sample taken', 'Feather sample taken',
  'Genetic sample taken', 'Other tests performed',
  'Tracheal Swab', 'Mouth Swab', 'Cloacal Swab',
  'Ectoparasites present', 'Ectoparasites collected',
  'User Field 1', 'User Field 2', 'User Field 3', 'User Field 4', 'User Field 5',
]

function recordToBBLRow(rec: AgencyRecord, idx: IndexedContext): string[] {
  const session = idx.sessionById.get(rec.sessionId)
  const location = session ? idx.locationById.get(session.locationId) : undefined
  const { year, month, day } = dateParts(rec, session)

  return [
    bandNumberRaw(rec.bandNumber),                                   // Band Number
    rec.speciesCode ?? '',                                           // Species (ALPHA code)
    rec.bbpCode ?? '',                                               // Disposition (BBL capture code)
    year,                                                            // Banding Year
    month,                                                           // Banding Month
    day,                                                             // Banding Day
    rec.age ?? '',                                                   // Age
    rec.howAged ?? '',                                               // How Aged (BBL 2-letter)
    rec.sex ?? '',                                                   // Sex
    rec.howSexed ?? '',                                              // How Sexed (BBL 2-letter)
    rec.status ?? '',                                                // Bird Status
    location?.banderLocationId ?? rec.station ?? '',                 // Location
    rec.notes ?? '',                                                 // Remarks
    bandNumberRaw(rec.replacedBandNumber),                           // Replaced Band Number
    '',                                                              // Reward Band Number
    banderInitials(idx, rec.bander),                                 // Bander ID
    '',                                                              // Scribe
    DEFAULT_CAPTURE_METHOD,                                          // How Captured
    captureTimeToNum(rec.captureTime),                               // Capture Time Enter or Paste Here
    rec.captureTime ?? '',                                           // Capture Time (HH:MM)
    DEFAULT_BANDED_LEG,                                              // Banded Leg
    num(rec.wing),                                                   // Wing Chord
    num(rec.tail),                                                   // Tail Length
    num(rec.tarsus),                                                 // Tarsus Length
    num(rec.exposedCulmen),                                          // Culmen Length
    '',                                                              // Bill Length
    '',                                                              // Bill Width
    '',                                                              // Bill Height
    num(rec.bodyMass),                                               // Bird Weight
    '',                                                              // Weight Time Enter or Paste Here
    '',                                                              // Weight Time
    '',                                                              // Eye color
    rec.fat ?? '',                                                   // Fat Score
    rec.skull ?? '',                                                 // Skull
    rec.bp ?? '',                                                    // Brood Patch
    rec.cp ?? '',                                                    // Cloacal Protuberance
    bodyMoltToBBL(rec.bodyMolt),                                     // Body Molt (BBL Y/N)
    ffMoltToBBL(rec.ffMolt),                                         // Flight Feather Molt (BBL Y/N)
    rec.wrp ?? '',                                                   // Molt Cycle Code (WRP)
    '',                                                              // Net Nest Cavity Designator
    '',                                                              // Net Nest Cavity Number
    '',                                                              // Plot ID
    '',                                                              // Sweep Number
    '',                                                              // Nest Location
    boolToYN(rec.bloodSample),                                       // Blood sample taken
    boolToYN(rec.featherPull),                                       // Feather sample taken
    '',                                                              // Genetic sample taken
    '',                                                              // Other tests performed
    '',                                                              // Tracheal Swab
    '',                                                              // Mouth Swab
    '',                                                              // Cloacal Swab
    '',                                                              // Ectoparasites present
    '',                                                              // Ectoparasites collected
    '',                                                              // User Field 1
    '',                                                              // User Field 2
    '',                                                              // User Field 3
    '',                                                              // User Field 4
    '',                                                              // User Field 5
  ]
}

// ── BBL Recapture Upload Format ───────────────────────────────────

const BBL_RECAP_HEADERS = [
  'Band Number', 'Species', 'Disposition',
  'Recapture Year', 'Recapture Month', 'Recapture Day',
  'Age', 'How Aged', 'Sex', 'How Sexed',
  'Bird Status', 'How Obtained', 'Present Condition',
  'Location', 'Remarks',
  'Second Band Number', 'Reward Band Number',
  'Bander ID', 'Scribe',
  'How Captured', 'Capture Time Enter or Paste Here', 'Capture Time',
  'Banded Leg',
  'Wing Chord', 'Tail Length', 'Tarsus Length', 'Culmen Length',
  'Bill Length', 'Bill Width', 'Bill Height',
  'Bird Weight', 'Weight Time Enter or Paste Here', 'Weight Time',
  'Eye color', 'Fat Score', 'Skull', 'Brood Patch', 'Cloacal Protuberance',
  'Body Molt', 'Flight Feather Molt', 'Molt Cycle Code',
  'Net Nest Cavity Designator', 'Net Nest Cavity Number',
  'Plot ID', 'Sweep Number', 'Nest Location',
  'Blood sample taken', 'Feather sample taken',
  'Genetic sample taken', 'Other tests performed',
  'Tracheal Swab', 'Mouth Swab', 'Cloacal Swab',
  'Ectoparasites present', 'Ectoparasites collected',
  'User Field 1', 'User Field 2', 'User Field 3', 'User Field 4', 'User Field 5',
]

function recordToBBLRecapRow(rec: AgencyRecord, idx: IndexedContext): string[] {
  const session = idx.sessionById.get(rec.sessionId)
  const location = session ? idx.locationById.get(session.locationId) : undefined
  const { year, month, day } = dateParts(rec, session)

  return [
    bandNumberRaw(rec.bandNumber),                                   // Band Number
    rec.speciesCode ?? '',                                           // Species (ALPHA code)
    rec.bbpCode ?? '',                                               // Disposition (BBL capture code)
    year,                                                            // Recapture Year
    month,                                                           // Recapture Month
    day,                                                             // Recapture Day
    rec.age ?? '',                                                   // Age
    rec.howAged ?? '',                                               // How Aged (BBL 2-letter)
    rec.sex ?? '',                                                   // Sex
    rec.howSexed ?? '',                                              // How Sexed (BBL 2-letter)
    rec.status ?? '',                                                // Bird Status
    DEFAULT_CAPTURE_METHOD,                                          // How Obtained
    rec.presentCondition ?? '',                                      // Present Condition
    location?.banderLocationId ?? rec.station ?? '',                 // Location
    rec.notes ?? '',                                                 // Remarks
    bandNumberRaw(rec.replacedBandNumber),                           // Second Band Number
    '',                                                              // Reward Band Number
    banderInitials(idx, rec.bander),                                 // Bander ID
    '',                                                              // Scribe
    DEFAULT_CAPTURE_METHOD,                                          // How Captured
    captureTimeToNum(rec.captureTime),                               // Capture Time Enter or Paste Here
    rec.captureTime ?? '',                                           // Capture Time (HH:MM)
    DEFAULT_BANDED_LEG,                                              // Banded Leg
    num(rec.wing),                                                   // Wing Chord
    num(rec.tail),                                                   // Tail Length
    num(rec.tarsus),                                                 // Tarsus Length
    num(rec.exposedCulmen),                                          // Culmen Length
    '',                                                              // Bill Length
    '',                                                              // Bill Width
    '',                                                              // Bill Height
    num(rec.bodyMass),                                               // Bird Weight
    '',                                                              // Weight Time Enter or Paste Here
    '',                                                              // Weight Time
    '',                                                              // Eye color
    rec.fat ?? '',                                                   // Fat Score
    rec.skull ?? '',                                                 // Skull
    rec.bp ?? '',                                                    // Brood Patch
    rec.cp ?? '',                                                    // Cloacal Protuberance
    bodyMoltToBBL(rec.bodyMolt),                                     // Body Molt (BBL Y/N)
    ffMoltToBBL(rec.ffMolt),                                         // Flight Feather Molt (BBL Y/N)
    rec.wrp ?? '',                                                   // Molt Cycle Code (WRP)
    '',                                                              // Net Nest Cavity Designator
    '',                                                              // Net Nest Cavity Number
    '',                                                              // Plot ID
    '',                                                              // Sweep Number
    '',                                                              // Nest Location
    boolToYN(rec.bloodSample),                                       // Blood sample taken
    boolToYN(rec.featherPull),                                       // Feather sample taken
    '',                                                              // Genetic sample taken
    '',                                                              // Other tests performed
    '',                                                              // Tracheal Swab
    '',                                                              // Mouth Swab
    '',                                                              // Cloacal Swab
    '',                                                              // Ectoparasites present
    '',                                                              // Ectoparasites collected
    '',                                                              // User Field 1
    '',                                                              // User Field 2
    '',                                                              // User Field 3
    '',                                                              // User Field 4
    '',                                                              // User Field 5
  ]
}

// ── CSV helpers ────────────────────────────────────────────────────

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export interface AgencyRows {
  headers: string[]
  rows: string[][]
}

/** Render a generated agency table as a CSV string without triggering a download. */
export function agencyCsvText({ headers, rows }: AgencyRows): string {
  return [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(',')),
  ].join('\n')
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const blob = new Blob([agencyCsvText({ headers, rows })], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Download a generated table as `<prefix>_<YYYY-MM-DD>.csv`. */
function downloadRows(prefix: string, { headers, rows }: { headers: string[]; rows: string[][] }): void {
  const date = new Date().toISOString().slice(0, 10)
  downloadCSV(`${prefix}_${date}.csv`, headers, rows)
}

export type ProjectionAgencyFormat = 'ibp' | 'bbl' | 'bbl-recap'

/**
 * Build an established agency CSV from current Workspace projection facts.
 * Only active Records are reportable; reference entities remain resolvable
 * regardless of lifecycle so a historical Record never loses its context.
 */
export function generateProjectionAgencyRows(
  projection: OperationalProjection,
  format: ProjectionAgencyFormat,
  sessionIds?: ReadonlySet<string>,
): AgencyRows {
  const { records, context } = projectionExportSource(projection, sessionIds)
  if (format === 'ibp') return generateIBPRows(records, context)
  if (format === 'bbl') return generateBBLRows(records, context)
  return generateBBLRecapRows(records, context)
}

/** Download already-generated Event-projection rows using the established filename pattern. */
export function downloadProjectionAgencyRows(format: ProjectionAgencyFormat, rows: AgencyRows): void {
  const prefix = format === 'ibp' ? 'birdnerd-ibp' : format === 'bbl' ? 'birdnerd-bbl' : 'birdnerd-bbl-recap'
  downloadRows(prefix, rows)
}

function projectionExportSource(
  projection: OperationalProjection,
  sessionIds: ReadonlySet<string> | undefined,
): { records: AgencyRecord[]; context: ExportContext } {
  const entities = projection.entities
  const sessions = [...entities.values()]
    .filter(entity => entity.kind === 'session')
    .map(entity => ({ id: entity.id, locationId: stringOrEmpty(entity.fields.station_id), date: stringOrUndefined(entity.fields.session_date) }))
  const context: ExportContext = {
    sessions,
    locations: [...entities.values()]
      .filter(entity => entity.kind === 'station')
      .map(entity => ({ id: entity.id, banderLocationId: stringOrUndefined(entity.fields.agency_code) })),
    bands: [...entities.values()]
      .filter(entity => entity.kind === 'band')
      .map(entity => ({ id: entity.id, bandSize: stringOrUndefined(entity.fields.band_size) })),
    people: [...entities.values()]
      .filter(entity => entity.kind === 'person')
      .map(entity => ({ id: entity.id, initials: stringOrUndefined(entity.fields.initials) })),
    banders: [...entities.values()]
      .filter(entity => entity.kind === 'bander')
      .map(entity => ({ id: entity.id, personId: stringOrEmpty(entity.fields.person_id) })),
  }
  const sessionById = new Map(context.sessions.map(session => [session.id, session]))
  const records = [...entities.values()]
    .filter(entity => entity.kind === 'banding-record' && entity.active)
    .filter(entity => !sessionIds || sessionIds.has(stringOrEmpty(entity.fields.session_id)))
    .sort((left, right) => (sessionById.get(stringOrEmpty(right.fields.session_id))?.date ?? '').localeCompare(sessionById.get(stringOrEmpty(left.fields.session_id))?.date ?? '') || left.id.localeCompare(right.id))
    .map(entity => projectedAgencyRecord(entity, entities))
  return { records, context }
}

function projectedAgencyRecord(entity: OperationalEntity, entities: ReadonlyMap<string, OperationalEntity>): AgencyRecord {
  const fields = entity.fields
  const band = projectionBandReference(fields)
  const net = entities.get(stringOrEmpty(fields.net_id))
  return {
    sessionId: stringOrEmpty(fields.session_id),
    bandId: band.bandId,
    bandNumber: band.bandNumber,
    speciesCode: stringOrUndefined(fields.species_code),
    age: stringOrUndefined(fields.age),
    howAged: stringOrUndefined(fields.how_aged),
    howAged2: stringOrUndefined(fields.how_aged_2),
    wrp: stringOrUndefined(fields.wrp),
    sex: stringOrUndefined(fields.sex),
    howSexed: stringOrUndefined(fields.how_sexed),
    howSexed2: stringOrUndefined(fields.how_sexed_2),
    skull: stringOrUndefined(fields.skull),
    cp: stringOrUndefined(fields.cp),
    bp: stringOrUndefined(fields.bp),
    fat: stringOrUndefined(fields.fat),
    bodyMolt: stringOrUndefined(fields.body_molt),
    ffMolt: stringOrUndefined(fields.ff_molt),
    ffWear: stringOrUndefined(fields.ff_wear),
    juvBodyPlumage: stringOrUndefined(fields.juv_body_plumage),
    moltLimitsPCovs: stringOrUndefined(fields.molt_limits_p_covs),
    moltLimitsSCovs: stringOrUndefined(fields.molt_limits_s_covs),
    moltLimitsPP: stringOrUndefined(fields.molt_limits_pp),
    moltLimitsSS: stringOrUndefined(fields.molt_limits_ss),
    moltLimitsTert: stringOrUndefined(fields.molt_limits_tert),
    moltLimitsRec: stringOrUndefined(fields.molt_limits_rec),
    moltLimitsBodyPlum: stringOrUndefined(fields.molt_limits_body_plum),
    moltLimitsNonFeather: stringOrUndefined(fields.molt_limits_non_feather),
    wing: numericOrUndefined(fields.wing),
    tail: numericOrUndefined(fields.tail),
    tarsus: numericOrUndefined(fields.tarsus),
    exposedCulmen: numericOrUndefined(fields.exposed_culmen),
    bodyMass: numericOrUndefined(fields.body_mass),
    status: stringOrUndefined(fields.status),
    captureTime: stringOrUndefined(fields.capture_time),
    net: net?.kind === 'net' ? stringOrUndefined(net.fields.label) : undefined,
    disposition: stringOrUndefined(fields.disposition),
    notes: stringOrUndefined(fields.notes),
    featherPull: booleanOrUndefined(fields.feather_pull),
    bloodSample: booleanOrUndefined(fields.blood_sample),
    bbpCode: stringOrUndefined(fields.capture_code),
    replacedBandNumber: stringOrUndefined(fields.replaced_band_number),
    presentCondition: stringOrUndefined(fields.present_condition),
    bander: stringOrUndefined(fields.bander_id),
  }
}

function projectionBandReference(fields: Record<string, unknown>): { bandId?: string; bandNumber?: string } {
  const selection = fields.band_selection
  if (isRecord(selection) && selection.kind === 'managed') return { bandId: stringOrUndefined(selection.band_id), bandNumber: stringOrUndefined(selection.band_number) }
  if (isRecord(selection) && selection.kind === 'foreign') return { bandNumber: stringOrUndefined(selection.band_number) }
  return { bandNumber: stringOrUndefined(fields.band_number) }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stringOrEmpty(value: unknown): string {
  return stringOrUndefined(value) ?? ''
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

function numericOrUndefined(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value !== '' && Number.isFinite(Number(value))) return Number(value)
  return undefined
}

function booleanOrUndefined(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

// ── Public API ─────────────────────────────────────────────────────

/** Generate IBP rows without triggering download (for testing) */
export function generateIBPRows(
  records: AgencyRecord[],
  ctx: ExportContext,
): AgencyRows {
  const idx = indexContext(ctx)
  return { headers: IBP_HEADERS, rows: records.map(r => recordToIBPRow(r, idx)) }
}

export function exportIBP(
  records: BirdRecord[],
  ctx: ExportContext,
  filenamePrefix: string = 'birdnerd-ibp',
): void {
  downloadRows(filenamePrefix, generateIBPRows(records, ctx))
}

/** Generate BBL Upload rows (new bandings only) without triggering download */
export function generateBBLRows(
  records: AgencyRecord[],
  ctx: ExportContext,
): AgencyRows {
  const idx = indexContext(ctx)
  const newBandings = records.filter(r => isNewBanding(r.bbpCode))
  return { headers: BBL_HEADERS, rows: newBandings.map(r => recordToBBLRow(r, idx)) }
}

export function exportBBL(
  records: BirdRecord[],
  ctx: ExportContext,
  filenamePrefix: string = 'birdnerd-bbl',
): void {
  downloadRows(filenamePrefix, generateBBLRows(records, ctx))
}

/** Generate BBL Recapture Upload rows without triggering download */
export function generateBBLRecapRows(
  records: AgencyRecord[],
  ctx: ExportContext,
): AgencyRows {
  const idx = indexContext(ctx)
  const recaps = records.filter(r => isRecapture(r.bbpCode))
  return { headers: BBL_RECAP_HEADERS, rows: recaps.map(r => recordToBBLRecapRow(r, idx)) }
}

export function exportBBLRecap(
  records: BirdRecord[],
  ctx: ExportContext,
  filenamePrefix: string = 'birdnerd-bbl-recap',
): void {
  downloadRows(filenamePrefix, generateBBLRecapRows(records, ctx))
}
