import {
  AGE_CODES,
  BP_CODES,
  BIRD_STATUS_CODES,
  BIRD_STATUS_CODE_VALUES,
  CAPTURE_STATUS_CODES,
  CP_CODES,
  DISPOSITION_CODES,
  FAT_CODES,
  FF_MOLT_CODES,
  FF_WEAR_CODES,
  HOW_AGED_CODES,
  HOW_SEXED_CODES,
  JUV_BODY_PLUMAGE_CODES,
  MOLT_CODES,
  MOLT_LIMITS_CODES,
  PRESENT_CONDITION_CODES,
  SEX_CODES,
  SKULL_CODES,
  WRP_CODES,
} from '@birdnerd/shared'

export {
  AGE_CODES,
  BP_CODES,
  BIRD_STATUS_CODES,
  BIRD_STATUS_CODE_VALUES,
  CAPTURE_STATUS_CODES,
  CP_CODES,
  DISPOSITION_CODES,
  FAT_CODES,
  FF_MOLT_CODES,
  FF_WEAR_CODES,
  HOW_AGED_CODES,
  HOW_SEXED_CODES,
  JUV_BODY_PLUMAGE_CODES,
  MOLT_CODES,
  MOLT_LIMITS_CODES,
  PRESENT_CONDITION_CODES,
  SEX_CODES,
  SKULL_CODES,
  WRP_CODES,
}

/** Capture codes that represent a new banding (BBL "1", IBP "N") */
const NEW_BANDING_CODES = new Set(['1', 'N'])
/** Capture codes that represent a recapture encounter */
const RECAPTURE_CODES = new Set(['R', 'F', '4', '5', '6', '8'])
/**
 * Capture codes that record a band's *fate* (removed from inventory) rather than a
 * bird capture — IBP letters D (destroyed) / L (lost). Per the MAPS protocol these
 * are omitted from new/recapture tallies, so they belong to neither set above.
 * See docs/apps/field/research-destroyed-bands.md.
 */
const BAND_FATE_CODES = new Set(['D', 'L'])
const BAND_FATE_LABELS: Record<string, string> = {
  D: 'Band destroyed',
  L: 'Band lost',
}

export function isNewBanding(code: string | undefined): boolean {
  return NEW_BANDING_CODES.has(code ?? '')
}

export function isRecapture(code: string | undefined): boolean {
  return RECAPTURE_CODES.has(code ?? '')
}

/** True for band-fate rows (destroyed/lost) — not a bird capture. */
export function isBandFate(code: string | undefined): boolean {
  return BAND_FATE_CODES.has(code ?? '')
}

/** Human label for a band-fate code ("Band destroyed"/"Band lost"), else undefined. */
export function bandFateLabel(code: string | undefined): string | undefined {
  return code ? BAND_FATE_LABELS[code] : undefined
}

// BBL Band Size codes
export const BAND_SIZE_CODES = [
  { code: '0', label: '0' },
  { code: '0A', label: '0A' },
  { code: '0B', label: '0B' },
  { code: '1', label: '1' },
  { code: '1A', label: '1A' },
  { code: '1B', label: '1B' },
  { code: '1C', label: '1C' },
  { code: '1D', label: '1D' },
  { code: '2', label: '2' },
  { code: '3', label: '3' },
  { code: '3A', label: '3A' },
  { code: '3B', label: '3B' },
  { code: '4', label: '4' },
  { code: '4A', label: '4A' },
  { code: '5', label: '5' },
  { code: '6', label: '6' },
  { code: '7', label: '7' },
  { code: '7A', label: '7A' },
  { code: '7B', label: '7B' },
  { code: '8', label: '8' },
  { code: '9', label: '9' },
]

// Band Type — TODO: confirm full list with Hallie
export const BAND_TYPE_CODES = [
  { code: 'Standard', label: 'Standard' },
  { code: 'Stainless-steel', label: 'Stainless steel' },
  { code: '4-short', label: '4-short' },
  { code: 'Lock-on', label: 'Lock-on' },
]

export const STATIONS = [
  { code: 'GCFS', name: 'Galindo Creek' },
  { code: 'MICA', name: 'Mitchell Canyon' },
]

export const PROTOCOL_CODES = [
  { code: 'MAPS', label: 'MAPS' },
  { code: 'Non-MAPS', label: 'Non-MAPS' },
  { code: 'Burrowing Owl', label: 'Burrowing Owl Banding' },
  { code: 'Rehabbed-Bird', label: 'Rehabbed-Bird Banding' },
  { code: 'Saw-whet Owl', label: 'Saw-whet Owl Banding' },
]
