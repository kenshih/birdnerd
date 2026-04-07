/**
 * Banding record validation rules.
 * Pure function — no DB or React dependencies. Returns a map of field name → warning message.
 * All warnings are soft (never block saving).
 */
import { isNewBanding } from '../data/codes'
import bandSizesData from '../data/band-sizes.json'
import measurementRangesData from '../data/measurement-ranges.json'

const bandSizes = bandSizesData as Record<string, string[]>
const measurementRanges = measurementRangesData as Record<string, {
  weight?: { femaleMin?: number; femaleMax?: number; maleMin?: number; maleMax?: number }
  wing?: { femaleMin?: number; femaleMax?: number; maleMin?: number; maleMax?: number }
  tail?: { femaleMin?: number; femaleMax?: number; maleMin?: number; maleMax?: number }
}>

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

  // Status 500 → require disposition + note
  if (values.status === '500') {
    if (!values.disposition) {
      warnings.disposition = 'Disposition required for Status 500'
    }
    if (!values.notes?.trim()) {
      warnings.notes = warnings.notes
        ? warnings.notes + '; also required for Status 500'
        : 'Note required for Status 500'
    }
  }

  // Mortality (Status "---") → require note
  if (values.status === '---') {
    if (!values.notes?.trim()) {
      warnings.notes = warnings.notes
        ? warnings.notes + '; also required for Mortality'
        : 'Note required for Mortality'
    }
  }

  // Status OT → require note
  if (values.status === 'OT') {
    if (!values.notes?.trim()) {
      warnings.notes = warnings.notes
        ? warnings.notes + '; also required for Status=Other'
        : 'Note required for Status=Other'
    }
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
