import type { BirdRecord } from '../types'

const NUMERIC_FIELDS = new Set(['wing', 'tail', 'tarsus', 'exposedCulmen', 'otherMeasurement', 'bodyMass'])
const BOOLEAN_FIELDS = new Set(['featherPull', 'bloodSample'])

const KNOWN_HEADERS = new Set([
  'bandNumber', 'speciesCode', 'age', 'sex', 'howAged', 'howAged2',
  'howSexed', 'howSexed2', 'bbpCode', 'wrp',
  'skull', 'cp', 'bp', 'fat', 'bodyMolt', 'ffMolt', 'tfMolt',
  'ffWear', 'juvBodyPlumage',
  'moltLimitsPCovs', 'moltLimitsSCovs', 'moltLimitsPP', 'moltLimitsSS',
  'moltLimitsTert', 'moltLimitsRec', 'moltLimitsBodyPlum', 'moltLimitsNonFeather',
  'moltLimitsPlumage',
  'wing', 'tail', 'tarsus', 'exposedCulmen', 'otherMeasurement', 'bodyMass',
  'status', 'disposition',
  'captureTime', 'releaseTime', 'date', 'station', 'net', 'bander',
  'featherPull', 'bloodSample', 'notes',
])

function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else current += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === ',') { fields.push(current); current = '' }
      else current += ch
    }
  }
  fields.push(current)
  return fields
}

export interface ImportResult {
  records: Omit<BirdRecord, 'id' | 'sessionId' | 'createdAt' | 'updatedAt'>[]
  skippedHeaders: string[]
  rowCount: number
}

export function parseCSV(text: string): ImportResult {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { records: [], skippedHeaders: [], rowCount: 0 }

  const headers = parseCSVLine(lines[0]!)
  const skippedHeaders = headers.filter(h => !KNOWN_HEADERS.has(h))

  const records = lines.slice(1).map(line => {
    const values = parseCSVLine(line)
    const record: Record<string, string | number | boolean | undefined> = {}
    headers.forEach((h, i) => {
      if (!KNOWN_HEADERS.has(h)) return
      const raw = values[i]?.trim()
      if (!raw) return
      if (NUMERIC_FIELDS.has(h)) {
        record[h] = parseFloat(raw) || undefined
      } else if (BOOLEAN_FIELDS.has(h)) {
        record[h] = raw === 'true' || raw === '1'
      } else {
        record[h] = raw
      }
    })
    return record as Omit<BirdRecord, 'id' | 'sessionId' | 'createdAt' | 'updatedAt'>
  })

  return { records, skippedHeaders, rowCount: records.length }
}
