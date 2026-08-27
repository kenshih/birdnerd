export type RecordBandMode = 'unbanded' | 'foreign' | 'managed' | 'legacy'

export type RecordBandReference = {
  mode: RecordBandMode
  bandNumber: string
  bandId: string
}

/**
 * Interprets a projected Record's Band facts without fabricating modern
 * inventory ownership for historical raw `band_number` values.
 */
export function recordBandReference(fields: Record<string, unknown>): RecordBandReference {
  const selection = fields.band_selection
  if (isRecord(selection) && selection.kind === 'managed') {
    return { mode: 'managed', bandNumber: stringOrEmpty(selection.band_number), bandId: stringOrEmpty(selection.band_id) }
  }
  if (isRecord(selection) && selection.kind === 'foreign') {
    return { mode: 'foreign', bandNumber: stringOrEmpty(selection.band_number), bandId: '' }
  }
  if (isRecord(selection) && selection.kind === 'unbanded') {
    return { mode: 'unbanded', bandNumber: '', bandId: '' }
  }

  const legacyBandNumber = stringOrEmpty(fields.band_number)
  return legacyBandNumber
    ? { mode: 'legacy', bandNumber: legacyBandNumber, bandId: '' }
    : { mode: 'unbanded', bandNumber: '', bandId: '' }
}

/** Labels a raw Phase 30 Band value as historical instead of guessing its current classification. */
export function legacyBandLabel(bandNumber: unknown): string {
  const number = stringOrEmpty(bandNumber)
  return `Historical Band (unresolved)${number ? ` — ${number}` : ''}`
}

/** Keeps the immutable managed-Band number snapshot visible when its parent is unavailable. */
export function unresolvedManagedBandLabel(bandNumber: unknown, bandId: unknown): string {
  const snapshot = stringOrEmpty(bandNumber)
  const id = stringOrEmpty(bandId)
  return `Unresolved managed Band${snapshot ? ` — ${snapshot}` : ''}${id ? ` (ID: ${id})` : ''}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stringOrEmpty(value: unknown): string {
  return value === undefined || value === null ? '' : String(value)
}
