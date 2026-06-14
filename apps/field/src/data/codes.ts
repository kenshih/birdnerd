import {
  AGE_CODES,
  BP_CODES,
  CAPTURE_STATUS_CODES,
  CP_CODES,
  FAT_CODES,
  FF_MOLT_CODES,
  FF_WEAR_CODES,
  HOW_AGED_CODES,
  HOW_SEXED_CODES,
  JUV_BODY_PLUMAGE_CODES,
  MOLT_CODES,
  SEX_CODES,
  SKULL_CODES,
  WRP_CODES,
} from '@birdnerd/shared'

export {
  AGE_CODES,
  BP_CODES,
  CAPTURE_STATUS_CODES,
  CP_CODES,
  FAT_CODES,
  FF_MOLT_CODES,
  FF_WEAR_CODES,
  HOW_AGED_CODES,
  HOW_SEXED_CODES,
  JUV_BODY_PLUMAGE_CODES,
  MOLT_CODES,
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


export const BIRD_STATUS_CODES = [
  { code: '300', label: '300 — healthy, released w/metal band' },
  { code: '301', label: '301 — healthy, released w/metal band and color band' },
  { code: '318', label: '318 — healthy, released w/metal band, and blood sampled' },
  { code: '319', label: '319 — healthy, released w/metal band with color band, and blood sampled' },
  { code: '500', label: '500 — injured, stressed, deformed, or sick bird released w/metal band' },
  { code: '700', label: '700 — rehabilitated bird released with metal band' },
  { code: '---', label: '--- — banding mortality' },
]

/** Set of the predefined status codes — used to detect a write-in (custom) value. */
export const BIRD_STATUS_CODE_VALUES = new Set(BIRD_STATUS_CODES.map(c => c.code))

// Disposition codes (from Hallie's doc)
export const DISPOSITION_CODES = [
  { code: 'M', label: 'M — Mortality' },
  { code: 'O', label: 'O — Old/heal?TBA injury' },
  { code: 'I', label: 'I — Illness/Disease' },
  { code: 'S', label: 'S — Stress/?TBA' },
  { code: 'E', label: 'E — Eye Injury' },
  { code: 'T', label: 'T — Tongue Injury' },
  { code: 'W', label: 'W — Wing Injury' },
  { code: 'B', label: 'B — Body Injury' },
  { code: 'L', label: 'L — Leg Injury' },
  { code: 'P', label: 'P — Predation' },
  { code: 'D', label: 'D — Dead' },
  { code: 'X', label: 'X — Ectoparasite' },
]

// Molt Limits & Plumage codes
export const MOLT_LIMITS_CODES = [
  { code: 'J', label: 'J — Juvenal' },
  { code: 'L', label: 'L — Limit' },
  { code: 'F', label: 'F — Formative' },
  { code: 'B', label: 'B — Basic' },
  { code: 'R', label: 'R — Retained' },
  { code: 'M', label: 'M — Molt' },
  { code: 'A', label: 'A — Alternate' },
  { code: 'N', label: 'N — Non-juvenal' },
  { code: 'X', label: 'X — Mixed Formative & Alternate' },
  { code: 'U', label: 'U — Unknown' },
]


// Present Condition (recapture)
export const PRESENT_CONDITION_CODES = [
  { code: 'H', label: 'H — Healthy' },
  { code: 'I', label: 'I — Injured' },
  { code: 'S', label: 'S — Sick/Stressed' },
  { code: 'D', label: 'D — Dead' },
]

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
