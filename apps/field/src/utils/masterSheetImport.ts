import type { BirdRecord, BandStatus } from '@birdnerd/shared'
import { BIRD_STATUS_CODES } from '../data/codes'
import { parseCSVLine } from './importCsv'

/**
 * Master-sheet (Hallie's "MASTER BANDING DATA") CSV → import plan.
 *
 * Pure, DB-free transform layer (Phase 25). It parses the master sheet, maps
 * its ~50 columns onto our schema, and derives the sessions / bands / records
 * to create — plus soft warnings and structural rejects. Applying the plan to
 * IndexedDB (with skip-if-exists dedup) lives in `applyMasterImport.ts`.
 *
 * The column→field mapping is the inverse of the IBP agency export
 * (`agencyExport.ts` `recordToIBPRow`), which is itself modeled to reproduce
 * this sheet. Keep the two in sync.
 */

// ── Code mappings ──────────────────────────────────────────────────

// Primary aging/sexing come straight from the BBL columns (already our codes).
// The *second* criterion only exists in the sheet as IBP single-letters, so we
// map it back to BBL here — the inverse of agencyExport's BBL→IBP tables, plus
// `J→PL` (juvenal→plumage) which appears in the data but not the export table.
const HOW_AGED_IBP_TO_BBL: Record<string, string> = {
  C: 'CL', S: 'SK', P: 'PL', F: 'FF', L: 'LP', I: 'MB', M: 'MR', O: 'OT', J: 'PL',
  BP: 'BP', CC: 'CC', EG: 'EG', EY: 'EY', FB: 'FB', IC: 'IC', NA: 'NA', NF: 'NF', NL: 'NL', NN: 'NN', RC: 'RC',
}
const HOW_SEXED_IBP_TO_BBL: Record<string, string> = {
  B: 'BP', C: 'CL', P: 'PL', E: 'EY', O: 'OT',
  CC: 'CC', EG: 'EG', MB: 'MB', NA: 'NA', TL: 'TL', WL: 'WL',
}

const STATUS_CODE_SET = new Set(BIRD_STATUS_CODES.map(c => c.code))

// Species-name markers for non-bird rows that only record a band event.
const BAND_EVENT_STATUS: Record<string, BandStatus> = {
  'BAND DESTROYED': 'destroyed',
  'BAND LOST': 'lost',
}

// ── Plan types ─────────────────────────────────────────────────────

export interface SessionDraft {
  /** Natural key for dedup: `${stationCode}|${date}` */
  key: string
  stationCode: string
  date: string
  /** Distinct bander initials seen on this station-day */
  banders: string[]
}

export interface BandDraft {
  /** Formatted XXXX-XXXXX */
  bandNumber: string
  /** Digits-only dedup key */
  digits: string
  status: BandStatus
  bandSize: string
  currentSpecies?: string
  deploymentDate?: string
}

/** A bird record's mapped field values (no id/sessionId/bandId/timestamps). */
export type RecordFields = Omit<BirdRecord, 'id' | 'sessionId' | 'bandId' | 'createdAt' | 'updatedAt'>

export interface RecordDraft {
  sessionKey: string
  bandDigits?: string
  fields: RecordFields
}

export interface ImportWarning {
  /** 1-based data row (excludes header) */
  row: number
  field: string
  message: string
}

export interface RejectRow {
  row: number
  problem: string
  raw: Record<string, string>
}

export interface ImportPlan {
  headers: string[]
  sessions: SessionDraft[]
  bands: BandDraft[]
  records: RecordDraft[]
  warnings: ImportWarning[]
  rejects: RejectRow[]
}

// ── Parsing ────────────────────────────────────────────────────────

export interface ParsedSheet {
  headers: string[]
  rows: Record<string, string>[]
}

export function parseMasterSheet(text: string): ParsedSheet {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: lines[0] ? parseCSVLine(lines[0]) : [], rows: [] }
  const headers = parseCSVLine(lines[0]!).map(h => h.trim())
  const rows = lines.slice(1).map(line => {
    const values = parseCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = (values[i] ?? '').trim() })
    return row
  })
  return { headers, rows }
}

// ── Field helpers ──────────────────────────────────────────────────

function toISODate(month: string, day: string, year: string): string | null {
  if (!month || !day || !year || !/^\d{4}$/.test(year)) return null
  const m = parseInt(month, 10)
  const d = parseInt(day, 10)
  if (!Number.isFinite(m) || !Number.isFinite(d) || m < 1 || m > 12 || d < 1 || d > 31) return null
  return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Raw band digits → { formatted XXXX-XXXXX, digits }. null when no digits. */
function formatBandNumber(raw: string): { formatted: string; digits: string } | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  const formatted = digits.length > 5 ? `${digits.slice(0, -5)}-${digits.slice(-5)}` : digits
  return { formatted, digits }
}

/** "710" → "07:10", "1140" → "11:40". undefined when blank. */
function parseCaptureTime(raw: string): string | undefined {
  const d = raw.replace(/\D/g, '')
  if (!d) return undefined
  const p = d.padStart(4, '0')
  return `${p.slice(0, 2)}:${p.slice(2, 4)}`
}

function num(raw: string): number | undefined {
  if (!raw) return undefined
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : undefined
}

function yn(raw: string): boolean | undefined {
  const v = raw.trim().toUpperCase()
  if (v === 'Y' || v === 'YES' || v === 'TRUE' || v === '1') return true
  if (v === 'N' || v === 'NO' || v === 'FALSE' || v === '0') return false
  return undefined
}

function blankIfEmpty(v: string): string | undefined {
  return v ? v : undefined
}

// ── Build plan ─────────────────────────────────────────────────────

export function buildImportPlan(parsed: ParsedSheet): ImportPlan {
  const warnings: ImportWarning[] = []
  const rejects: RejectRow[] = []
  const sessionMap = new Map<string, SessionDraft>()
  const bands: BandDraft[] = []
  const bandSeen = new Set<string>()
  const records: RecordDraft[] = []

  parsed.rows.forEach((r, i) => {
    const row = i + 1 // 1-based data row
    const get = (k: string) => r[k] ?? ''

    const stationCode = get('Station')
    const date = toISODate(get('Month'), get('Day'), get('Year'))

    if (!date) {
      rejects.push({ row, problem: `Unparseable or missing date (Month/Day/Year = "${get('Month')}/${get('Day')}/${get('Year')}") — cannot assign to a session`, raw: r })
      return
    }
    if (!stationCode) {
      rejects.push({ row, problem: 'Missing Station — cannot assign to a session', raw: r })
      return
    }

    const sessionKey = `${stationCode}|${date}`
    let session = sessionMap.get(sessionKey)
    if (!session) {
      session = { key: sessionKey, stationCode, date, banders: [] }
      sessionMap.set(sessionKey, session)
    }
    const bander = get('Bander')
    if (bander && !session.banders.includes(bander)) session.banders.push(bander)

    // Band number + band entity
    const speciesName = get('Species Name').toUpperCase().trim()
    const bandEventStatus = BAND_EVENT_STATUS[speciesName]
    const bn = formatBandNumber(get('Band Number'))
    const speciesCode = blankIfEmpty(get('ALPHA Code'))

    if (bn && !bandSeen.has(bn.digits)) {
      bandSeen.add(bn.digits)
      const status: BandStatus = bandEventStatus ?? 'deployed'
      bands.push({
        bandNumber: bn.formatted,
        digits: bn.digits,
        status,
        bandSize: get('Band Size'),
        currentSpecies: status === 'deployed' ? speciesCode : undefined,
        deploymentDate: status === 'deployed' ? date : undefined,
      })
      if (!get('Band Size')) warnings.push({ row, field: 'Band Size', message: `Band ${bn.formatted}: no band size in sheet` })
      // Band type is never in the master sheet; the apply layer defaults it to 'Standard'.
    }

    // Band-event rows create the band only — no bird record.
    if (bandEventStatus) return

    // ── Bird record field mapping ──
    const howAged = blankIfEmpty(get('How Aged BBL'))

    // How Sexed BBL: the sheet has one Excel-artifact "FALSE" cell → treat as blank + warn.
    const howSexedRaw = get('How Sexed BBL')
    let howSexed: string | undefined
    if (howSexedRaw.toUpperCase() === 'FALSE') {
      warnings.push({ row, field: 'How Sexed BBL', message: 'Value "FALSE" looks like an Excel artifact — imported as blank' })
    } else {
      howSexed = blankIfEmpty(howSexedRaw)
    }

    // Second aging/sexing criterion: only present as IBP single-letters → map to BBL.
    const howAged2 = mapSecondCriterion(get('How Aged IBP 2'), HOW_AGED_IBP_TO_BBL, row, 'How Aged IBP 2', warnings)
    const howSexed2 = mapSecondCriterion(get('How Sexed IBP 2'), HOW_SEXED_IBP_TO_BBL, row, 'How Sexed IBP 2', warnings)

    const status = blankIfEmpty(get('Status'))
    if (status && !STATUS_CODE_SET.has(status)) {
      warnings.push({ row, field: 'Status', message: `BBL status "${status}" is not in BIRD_STATUS_CODES — imported as-is` })
    }

    const fields: RecordFields = {
      bandNumber: bn?.formatted,
      speciesCode,
      age: blankIfEmpty(get('Age NUMBER')),
      sex: blankIfEmpty(get('Sex')),
      howAged,
      howAged2,
      howSexed,
      howSexed2,
      bbpCode: blankIfEmpty(get('Code BBL')),
      wrp: blankIfEmpty(get('WRP')),
      skull: blankIfEmpty(get('Skull')),
      cp: blankIfEmpty(get('Cloacal Protuberance')),
      bp: blankIfEmpty(get('Brood Patch')),
      fat: blankIfEmpty(get('Fat')),
      bodyMolt: blankIfEmpty(get('Body Molt IBP')),
      ffMolt: blankIfEmpty(get('FF Molt IBP')),
      ffWear: blankIfEmpty(get('Flight Feather Wear')),
      juvBodyPlumage: blankIfEmpty(get('Juv. Body Plumage')),
      moltLimitsPCovs: blankIfEmpty(get('P covs')),
      moltLimitsSCovs: blankIfEmpty(get('S covs')),
      moltLimitsPP: blankIfEmpty(get('PP')),
      moltLimitsSS: blankIfEmpty(get('SS')),
      moltLimitsTert: blankIfEmpty(get('Tert')),
      moltLimitsRec: blankIfEmpty(get('Rec')),
      moltLimitsBodyPlum: blankIfEmpty(get('Body Plum')),
      moltLimitsNonFeather: blankIfEmpty(get('Non-Feath')),
      wing: num(get('Wing')),
      bodyMass: num(get('Body Mass')),
      status,
      disposition: blankIfEmpty(get('Disposition')),
      captureTime: parseCaptureTime(get('Capture Time')),
      date,
      station: stationCode,
      net: blankIfEmpty(get('Net')),
      bander: blankIfEmpty(bander),
      featherPull: yn(get('Feather Pull BBL')) ?? yn(get('Feather Pull')),
      bloodSample: yn(get('Blood Sample BBL')),
      notes: blankIfEmpty(get('Note')),
    }

    records.push({ sessionKey, bandDigits: bn?.digits, fields })
  })

  return {
    headers: parsed.headers,
    sessions: [...sessionMap.values()],
    bands,
    records,
    warnings,
    rejects,
  }
}

function mapSecondCriterion(
  raw: string,
  table: Record<string, string>,
  row: number,
  field: string,
  warnings: ImportWarning[],
): string | undefined {
  const v = raw.trim()
  if (!v) return undefined
  const mapped = table[v]
  if (!mapped) {
    warnings.push({ row, field, message: `IBP code "${v}" has no BBL mapping — dropped` })
    return undefined
  }
  return mapped
}

/** Serialize rejects to a CSV string: original columns + a trailing `_problem`. */
export function rejectsToCsv(headers: string[], rejects: RejectRow[]): string {
  const cols = [...headers, '_problem']
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const lines = [cols.map(esc).join(',')]
  for (const rej of rejects) {
    const values = headers.map(h => esc(rej.raw[h] ?? ''))
    values.push(esc(rej.problem))
    lines.push(values.join(','))
  }
  return lines.join('\n')
}
