/**
 * Banding record validation rules.
 * Pure function — no DB or React dependencies. Returns a map of field name → warning message.
 * All warnings are soft (never block saving).
 */
import { isNewBanding, isBandFate } from '../data/codes'
import { isUuidV7, parseRfc3339Milliseconds, upcastEvent, type DomainEvent } from '@birdnerd/events'
import bandSizesData from '../data/band-sizes.json'
import measurementRangesData from '../data/measurement-ranges.json'

const bandSizes = bandSizesData as Record<string, string[]>
const measurementRanges = measurementRangesData as Record<string, {
  weight?: { femaleMin?: number; femaleMax?: number; maleMin?: number; maleMax?: number }
  wing?: { femaleMin?: number; femaleMax?: number; maleMin?: number; maleMax?: number }
  tail?: { femaleMin?: number; femaleMax?: number; maleMin?: number; maleMax?: number }
}>

export const EVENT_BUNDLE_FORMAT_VERSION = 1

export type WorkspaceEventBundle = {
  format: 'birdnerd-workspace-event-bundle'
  format_version: typeof EVENT_BUNDLE_FORMAT_VERSION
  manifest: {
    workspace_id: string
    exported_at: string
    event_count: number
    event_ids: string[]
    content_sha256: string
  }
  events: DomainEvent[]
}

/** Validate the full recovery container and every Event before IndexedDB writes. */
export async function parseWorkspaceEventBundle(serialized: string): Promise<WorkspaceEventBundle> {
  const value: unknown = JSON.parse(serialized)
  if (!isRecord(value) || value.format !== 'birdnerd-workspace-event-bundle' || value.format_version !== EVENT_BUNDLE_FORMAT_VERSION
    || !isRecord(value.manifest) || !Array.isArray(value.events)) throw new Error('Unsupported or malformed Workspace Event Bundle.')
  const workspaceId = value.manifest.workspace_id
  if (typeof workspaceId !== 'string' || !isUuidV7(workspaceId)) throw new Error('Bundle manifest Workspace ID is invalid.')
  if (typeof value.manifest.content_sha256 !== 'string' || value.manifest.content_sha256 !== await workspaceEventContentSha256(value.events)) {
    throw new Error('Bundle Event Log integrity check failed.')
  }
  const events = value.events.map(upcastEvent)
  validateWorkspaceEventScope(workspaceId, events)
  const ids = events.map(event => event.event_id)
  if (value.manifest.event_count !== events.length || !Array.isArray(value.manifest.event_ids)
    || value.manifest.event_ids.length !== ids.length || value.manifest.event_ids.some((id, index) => id !== ids[index])) {
    throw new Error('Bundle manifest does not match its Event Log.')
  }
  if (typeof value.manifest.exported_at !== 'string') throw new Error('Bundle export timestamp is invalid.')
  parseRfc3339Milliseconds(value.manifest.exported_at)
  return { ...value, events } as unknown as WorkspaceEventBundle
}

export function validateWorkspaceEventScope(workspaceId: string, events: readonly DomainEvent[]): void {
  if (!isUuidV7(workspaceId)) throw new Error('Workspace ID is invalid.')
  const ids = new Set<string>()
  for (const event of events) {
    if (event.workspace_id !== workspaceId) throw new Error('Bundle contains an Event from another Workspace.')
    if (ids.has(event.event_id)) throw new Error('Bundle contains a duplicate Event ID.')
    ids.add(event.event_id)
  }
}

export async function workspaceEventContentSha256(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)))
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export interface ValidationInput {
  sex?: string
  bp?: string
  cp?: string
  howAged?: string
  howAged2?: string
  howSexed?: string
  howSexed2?: string
  age?: string
  skull?: string
  status?: string
  disposition?: string
  bloodSample?: boolean
  notes?: string
  net?: string
  bandStatus?: string       // Band entity status: 'available', 'deployed', etc.
  captureCode?: string      // bbpCode: '1', 'R', 'U', 'F', etc.
  isOwnBand?: boolean       // true when editing a record that deployed this band
  bandSize?: string         // Band entity size (e.g. '1B'), for species band-size validation
  speciesCode?: string      // ALPHA code, for species range validation
  wing?: number
  bodyMass?: number
  tail?: number
}

export type ValidationWarnings = Partial<Record<string, string>>

/** Check if a measurement value is outside the expected range for a species + sex. */
function measurementWarning(
  value: number | undefined,
  range: { femaleMin?: number; femaleMax?: number; maleMin?: number; maleMax?: number } | undefined,
  sex: string | undefined,
  label: string,
): string | undefined {
  if (value == null || !range) return undefined

  if (sex === 'F') {
    const { femaleMin, femaleMax } = range
    if (femaleMin != null && femaleMax != null && (value < femaleMin || value > femaleMax)) {
      return `${label} ${value} outside expected female range (${femaleMin}–${femaleMax})`
    }
  } else if (sex === 'M') {
    const { maleMin, maleMax } = range
    if (maleMin != null && maleMax != null && (value < maleMin || value > maleMax)) {
      return `${label} ${value} outside expected male range (${maleMin}–${maleMax})`
    }
  } else {
    // Unknown sex: warn only if outside BOTH ranges
    const { femaleMin, femaleMax, maleMin, maleMax } = range
    const outsideFemale = femaleMin != null && femaleMax != null && (value < femaleMin || value > femaleMax)
    const outsideMale = maleMin != null && maleMax != null && (value < maleMin || value > maleMax)
    const femaleSpecified = femaleMin != null && femaleMax != null
    const maleSpecified = maleMin != null && maleMax != null
    if (femaleSpecified && maleSpecified && outsideFemale && outsideMale) {
      const min = Math.min(femaleMin!, maleMin!)
      const max = Math.max(femaleMax!, maleMax!)
      return `${label} ${value} outside expected range (${min}–${max})`
    }
  }
  return undefined
}

/**
 * Evaluate all validation rules against current form values.
 * @param values - Current form field values
 * @param sessionNetLabels - Set of net labels that are in this session's effort log (from SessionNetLog)
 */
export function validateRecord(
  values: ValidationInput,
  sessionNetLabels?: Set<string>,
): ValidationWarnings {
  const warnings: ValidationWarnings = {}

  // Band-fate rows (destroyed/lost) carry no bird data — skip all bird-field warnings.
  if (isBandFate(values.captureCode)) return warnings

  // Sex=M + Brood Patch 3/4 → error on BP
  if (values.sex === 'M' && (values.bp === '3' || values.bp === '4')) {
    warnings.bp = 'Sex=M conflicts with Brood Patch 3/4'
  }

  // Sex=F + Cloacal Protuberance 1-3 → error on CP
  if (values.sex === 'F' && values.cp && ['1', '2', '3'].includes(values.cp)) {
    warnings.cp = 'Sex=F conflicts with Cloacal Protuberance'
  }

  // SK in How Aged → require Skull field
  const agedBySK = values.howAged === 'SK' || values.howAged2 === 'SK'
  if (agedBySK && !values.skull) {
    warnings.skull = 'Skull required when aged by SK'
  }

  // How Aged/Sexed = OT → require note
  const otInHowAged = values.howAged === 'OT' || values.howAged2 === 'OT'
  const otInHowSexed = values.howSexed === 'OT' || values.howSexed2 === 'OT'
  if ((otInHowAged || otInHowSexed) && !values.notes?.trim()) {
    warnings.notes = 'Note required when How Aged/Sexed = Other'
  }

  // Status 500 → also require disposition (the notes rule below covers the note)
  if (values.status === '500' && !values.disposition) {
    warnings.disposition = 'Disposition required for Status 500'
  }

  // Remarks (notes) required for any status other than blank or 300 —
  // covers 318/319/500/700, mortality (---), and any write-in code.
  if (values.status && values.status !== '300' && !values.notes?.trim()) {
    const label = values.status === '---' ? 'Mortality' : `Status ${values.status}`
    warnings.notes = warnings.notes
      ? warnings.notes + `; also required for ${label}`
      : `Note required for ${label}`
  }

  // Blood Sample checked → status should be 318, 319, or 334
  if (values.bloodSample) {
    if (!values.status) {
      warnings.status = 'Blood sample taken — Status should be 318, 319, or 334'
    } else if (values.status !== '318' && values.status !== '319' && values.status !== '334') {
      warnings.status = 'Blood sample taken — expected Status 318, 319, or 334'
    }
  }

  // Net not in session effort log
  if (values.net && sessionNetLabels && sessionNetLabels.size > 0 && !sessionNetLabels.has(values.net)) {
    warnings.net = `Net ${values.net} not in session effort log`
  }

  // Band status vs capture code conflicts (skip if this record owns the band)
  if (values.bandStatus && values.captureCode && !values.isOwnBand) {
    if (isNewBanding(values.captureCode) && values.bandStatus === 'deployed') {
      warnings.bbpCode = 'This band is already deployed — expected Recapture (R), not New'
    }
    if (values.captureCode === 'R' && values.bandStatus === 'available') {
      warnings.bbpCode = 'This band shows as available — expected New (1), not Recapture (R)'
    }
  }

  // Band size mismatch for species
  if (values.bandSize && values.speciesCode) {
    const validSizes = bandSizes[values.speciesCode]
    if (validSizes && !validSizes.includes(values.bandSize)) {
      warnings.bandSize = `Band size ${values.bandSize} is unusual for ${values.speciesCode} (expected: ${validSizes.join(', ')})`
    }
  }

  // Morphometric range validation
  if (values.speciesCode) {
    const speciesRanges = measurementRanges[values.speciesCode]
    if (speciesRanges) {
      const wingWarn = measurementWarning(values.wing, speciesRanges.wing, values.sex, 'Wing')
      if (wingWarn) warnings.wing = wingWarn

      const massWarn = measurementWarning(values.bodyMass, speciesRanges.weight, values.sex, 'Body mass')
      if (massWarn) warnings.bodyMass = massWarn

      const tailWarn = measurementWarning(values.tail, speciesRanges.tail, values.sex, 'Tail')
      if (tailWarn) warnings.tail = tailWarn
    }
  }

  // Disposition requires notes
  if (values.disposition && !values.notes?.trim()) {
    warnings.notes = warnings.notes
      ? warnings.notes + '; also required when Disposition is set'
      : 'Note required when Disposition is set'
  }

  return warnings
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
