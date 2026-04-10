import type { BirdRecord, Session, Location, Band, Person, Bander } from '@birdnerd/shared'
import { isNewBanding, isRecapture } from '../data/codes'

// ── Code Mappings ──────────────────────────────────────────────────

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

// Body Molt: IBP numeric 0-4 → BBL Y/N
function bodyMoltToBBL(ibp: string | undefined): string {
  if (!ibp) return ''
  return ibp === '0' ? 'N' : 'Y'
}

// FF Molt: IBP letter → BBL Y/N
function ffMoltToBBL(ibp: string | undefined): string {
  if (!ibp) return ''
  return ibp === 'N' ? 'N' : ibp === '0' ? 'N' : 'Y'
}

// Capture Code: our codes are a mix of IBP/BBL (1, U, R, F, 4, 5, 6, 8, X)
// IBP uses letters (N, U, R, F, D, etc.), BBL uses numbers (1, U, R, F, 4, 5, 6, 8, X)
// Our app stores the BBL version already
const CAPTURE_CODE_TO_IBP: Record<string, string> = {
  '1': 'N', 'N': 'N', '4': 'D', '5': '5', '6': '6', '8': 'L',
  'U': 'U', 'R': 'R', 'F': 'F', 'X': 'X',
}

// Age: our app stores numeric BBL codes → alpha for display
const AGE_NUM_TO_ALPHA: Record<string, string> = {
  '1': 'AHY', '2': 'HY', '4': 'ASY', '5': 'SY',
  '6': 'ATY', '7': 'TY', '8': 'L', 'U': 'U',
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

// ── Lookup helpers ─────────────────────────────────────────────────

interface ExportContext {
  sessions: Session[]
  locations: Location[]
  bands: Band[]
  people: Person[]
  banders: Bander[]
}

function lookupSession(ctx: ExportContext, sessionId: string): Session | undefined {
  return ctx.sessions.find(s => s.id === sessionId)
}

function lookupLocation(ctx: ExportContext, locationId: string): Location | undefined {
  return ctx.locations.find(l => l.id === locationId)
}

function lookupBand(ctx: ExportContext, bandId: string | undefined): Band | undefined {
  if (!bandId) return undefined
  return ctx.bands.find(b => b.id === bandId)
}

function lookupBanderInitials(ctx: ExportContext, banderField: string | undefined): string {
  if (!banderField) return ''
  // banderField might be initials directly or a bander ID
  const bander = ctx.banders.find(b => b.id === banderField)
  if (bander) {
    const person = ctx.people.find(p => p.id === bander.personId)
    return person?.initials ?? ''
  }
  return banderField // fallback: already initials
}

function speciesNameFromCode(_code: string | undefined): string {
  // Species name lookup would require the full species list
  // For now, return empty — the ALPHA code is the primary identifier
  return ''
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

function recordToIBPRow(rec: BirdRecord, ctx: ExportContext): string[] {
  const session = lookupSession(ctx, rec.sessionId)
  const location = session ? lookupLocation(ctx, session.locationId) : undefined
  const band = lookupBand(ctx, rec.bandId)

  // Date components
  const [year, month, day] = (rec.date ?? session?.date ?? '').split('-')

  return [
    lookupBanderInitials(ctx, rec.bander),                          // Bander
    CAPTURE_CODE_TO_IBP[rec.bbpCode ?? ''] ?? rec.bbpCode ?? '',    // Code IBP
    rec.bbpCode ?? '',                                               // Code BBL
    band?.bandSize ?? '',                                            // Band Size
    bandNumberRaw(rec.bandNumber),                                   // Band Number
    speciesNameFromCode(rec.speciesCode),                            // Species Name
    rec.speciesCode ?? '',                                           // ALPHA Code
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
    rec.wing != null ? String(rec.wing) : '',                        // Wing
    rec.bodyMass != null ? String(rec.bodyMass) : '',                // Body Mass
    rec.status ?? '',                                                // Status
    month ? String(parseInt(month, 10)) : '',                        // Month (no leading zero)
    day ? String(parseInt(day, 10)) : '',                            // Day (no leading zero)
    year ?? '',                                                      // Year
    captureTimeToNum(rec.captureTime),                               // Capture Time
    location?.banderLocationId ?? rec.station ?? '',                  // Station
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

function recordToBBLRow(rec: BirdRecord, ctx: ExportContext): string[] {
  const session = lookupSession(ctx, rec.sessionId)
  const location = session ? lookupLocation(ctx, session.locationId) : undefined

  const [year, month, day] = (rec.date ?? session?.date ?? '').split('-')

  return [
    bandNumberRaw(rec.bandNumber),                                   // Band Number
    rec.speciesCode ?? '',                                           // Species (ALPHA code)
    rec.bbpCode ?? '',                                               // Disposition (BBL capture code)
    year ?? '',                                                      // Banding Year
    month ? String(parseInt(month, 10)) : '',                        // Banding Month
    day ? String(parseInt(day, 10)) : '',                            // Banding Day
    rec.age ?? '',                                                   // Age
    rec.howAged ?? '',                                               // How Aged (BBL 2-letter)
    rec.sex ?? '',                                                   // Sex
    rec.howSexed ?? '',                                              // How Sexed (BBL 2-letter)
    rec.status ?? '',                                                // Bird Status
    location?.banderLocationId ?? rec.station ?? '',                  // Location
    rec.notes ?? '',                                                 // Remarks
    bandNumberRaw(rec.replacedBandNumber),                            // Replaced Band Number
    '',                                                              // Reward Band Number
    lookupBanderInitials(ctx, rec.bander),                           // Bander ID
    '',                                                              // Scribe
    'Mist net',                                                      // How Captured (hardcoded)
    captureTimeToNum(rec.captureTime),                               // Capture Time Enter or Paste Here
    rec.captureTime ?? '',                                           // Capture Time (HH:MM)
    'R',                                                             // Banded Leg (hardcoded)
    rec.wing != null ? String(rec.wing) : '',                        // Wing Chord
    rec.tail != null ? String(rec.tail) : '',                        // Tail Length
    rec.tarsus != null ? String(rec.tarsus) : '',                    // Tarsus Length
    rec.exposedCulmen != null ? String(rec.exposedCulmen) : '',      // Culmen Length
    '',                                                              // Bill Length
    '',                                                              // Bill Width
    '',                                                              // Bill Height
    rec.bodyMass != null ? String(rec.bodyMass) : '',                // Bird Weight
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

function recordToBBLRecapRow(rec: BirdRecord, ctx: ExportContext): string[] {
  const session = lookupSession(ctx, rec.sessionId)
  const location = session ? lookupLocation(ctx, session.locationId) : undefined

  const [year, month, day] = (rec.date ?? session?.date ?? '').split('-')

  return [
    bandNumberRaw(rec.bandNumber),                                   // Band Number
    rec.speciesCode ?? '',                                           // Species (ALPHA code)
    rec.bbpCode ?? '',                                               // Disposition (BBL capture code)
    year ?? '',                                                      // Recapture Year
    month ? String(parseInt(month, 10)) : '',                        // Recapture Month
    day ? String(parseInt(day, 10)) : '',                            // Recapture Day
    rec.age ?? '',                                                   // Age
    rec.howAged ?? '',                                               // How Aged (BBL 2-letter)
    rec.sex ?? '',                                                   // Sex
    rec.howSexed ?? '',                                              // How Sexed (BBL 2-letter)
    rec.status ?? '',                                                // Bird Status
    'Mist net',                                                      // How Obtained (hardcoded)
    rec.presentCondition ?? '',                                      // Present Condition
    location?.banderLocationId ?? rec.station ?? '',                  // Location
    rec.notes ?? '',                                                 // Remarks
    bandNumberRaw(rec.replacedBandNumber),                            // Second Band Number
    '',                                                              // Reward Band Number
    lookupBanderInitials(ctx, rec.bander),                           // Bander ID
    '',                                                              // Scribe
    'Mist net',                                                      // How Captured (hardcoded)
    captureTimeToNum(rec.captureTime),                               // Capture Time Enter or Paste Here
    rec.captureTime ?? '',                                           // Capture Time (HH:MM)
    'R',                                                             // Banded Leg (hardcoded)
    rec.wing != null ? String(rec.wing) : '',                        // Wing Chord
    rec.tail != null ? String(rec.tail) : '',                        // Tail Length
    rec.tarsus != null ? String(rec.tarsus) : '',                    // Tarsus Length
    rec.exposedCulmen != null ? String(rec.exposedCulmen) : '',      // Culmen Length
    '',                                                              // Bill Length
    '',                                                              // Bill Width
    '',                                                              // Bill Height
    rec.bodyMass != null ? String(rec.bodyMass) : '',                // Bird Weight
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

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const lines = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Public API ─────────────────────────────────────────────────────

/** Generate IBP rows without triggering download (for testing) */
export function generateIBPRows(
  records: BirdRecord[],
  ctx: ExportContext,
): { headers: string[]; rows: string[][] } {
  return { headers: IBP_HEADERS, rows: records.map(r => recordToIBPRow(r, ctx)) }
}

export function exportIBP(
  records: BirdRecord[],
  ctx: ExportContext,
  filenamePrefix: string = 'birdnerd-ibp',
): void {
  const { headers, rows } = generateIBPRows(records, ctx)
  const date = new Date().toISOString().slice(0, 10)
  downloadCSV(`${filenamePrefix}_${date}.csv`, headers, rows)
}

/** Generate BBL Upload rows (new bandings only) without triggering download */
export function generateBBLRows(
  records: BirdRecord[],
  ctx: ExportContext,
): { headers: string[]; rows: string[][] } {
  const newBandings = records.filter(r => isNewBanding(r.bbpCode))
  return { headers: BBL_HEADERS, rows: newBandings.map(r => recordToBBLRow(r, ctx)) }
}

export function exportBBL(
  records: BirdRecord[],
  ctx: ExportContext,
  filenamePrefix: string = 'birdnerd-bbl',
): void {
  const { headers, rows } = generateBBLRows(records, ctx)
  const date = new Date().toISOString().slice(0, 10)
  downloadCSV(`${filenamePrefix}_${date}.csv`, headers, rows)
}

/** Generate BBL Recapture Upload rows without triggering download */
export function generateBBLRecapRows(
  records: BirdRecord[],
  ctx: ExportContext,
): { headers: string[]; rows: string[][] } {
  const recaps = records.filter(r => isRecapture(r.bbpCode))
  return { headers: BBL_RECAP_HEADERS, rows: recaps.map(r => recordToBBLRecapRow(r, ctx)) }
}

export function exportBBLRecap(
  records: BirdRecord[],
  ctx: ExportContext,
  filenamePrefix: string = 'birdnerd-bbl-recap',
): void {
  const { headers, rows } = generateBBLRecapRows(records, ctx)
  const date = new Date().toISOString().slice(0, 10)
  downloadCSV(`${filenamePrefix}_${date}.csv`, headers, rows)
}
