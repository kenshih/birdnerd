export interface CodeOption {
  code: string
  /**
   * Description only — do NOT repeat the code here (e.g. 'Trace', not '1 — Trace').
   * Views that want to show the code prepend it at render time, e.g. `{code} — {label}`.
   */
  label: string
}

export const AGE_CODES: CodeOption[] = [
  { code: '1', label: 'After Hatch Year (AHY)' },
  { code: '2', label: 'Hatch Year (HY)' },
  { code: '4', label: 'Local (L)' },
  { code: '5', label: 'Second Year (SY)' },
  { code: '6', label: 'After Second Year (ASY)' },
  { code: '7', label: 'Third Year (TY)' },
  { code: '8', label: 'After Third Year (ATY)' },
  { code: 'U', label: 'Unknown' },
]

export const SEX_CODES: CodeOption[] = [
  { code: 'M', label: 'Male' },
  { code: 'F', label: 'Female' },
  { code: 'U', label: 'Unknown' },
]

export const HOW_AGED_CODES: CodeOption[] = [
  { code: 'BP', label: 'Brood Patch' },
  { code: 'CC', label: 'Cloacal Characters' },
  { code: 'CL', label: 'Cloacal Protuberance' },
  { code: 'EG', label: 'Egg in Oviduct' },
  { code: 'EY', label: 'Eye Color' },
  { code: 'FB', label: 'Fault Bars' },
  { code: 'FF', label: 'Flight Feathers' },
  { code: 'IC', label: 'Incomplete Cloacal Protuberance' },
  { code: 'LP', label: 'Limit of Plumage' },
  { code: 'MB', label: 'Mouth/Bill' },
  { code: 'MR', label: 'Molt Record' },
  { code: 'NA', label: 'Not Attempted' },
  { code: 'NF', label: 'Non-feather' },
  { code: 'NL', label: 'No Limit' },
  { code: 'NN', label: 'Not Needed' },
  { code: 'PL', label: 'Plumage' },
  { code: 'RC', label: 'Rectrix Color' },
  { code: 'SK', label: 'Skull' },
  { code: 'OT', label: 'Other' },
]

export const HOW_SEXED_CODES: CodeOption[] = [
  { code: 'BP', label: 'Brood Patch' },
  { code: 'CC', label: 'Cloacal Characters' },
  { code: 'CL', label: 'Cloacal Protuberance' },
  { code: 'EG', label: 'Egg in Oviduct' },
  { code: 'EY', label: 'Eye Color' },
  { code: 'MB', label: 'Mouth/Bill' },
  { code: 'NA', label: 'Not Attempted' },
  { code: 'PL', label: 'Plumage' },
  { code: 'TL', label: 'Tail Length' },
  { code: 'WL', label: 'Wing Length' },
  { code: 'OT', label: 'Other' },
]

export const WRP_CODES: CodeOption[] = [
  { code: 'FPJ', label: 'First Prejuvenile' },
  { code: 'FCJ', label: 'First Cycle Juvenal' },
  { code: 'FPX', label: 'First Pre-auxiliary' },
  { code: 'FCX', label: 'First Cycle Auxiliary' },
  { code: 'FPF', label: 'First Preformative' },
  { code: 'MFPF', label: 'Minimum First Preformative' },
  { code: 'FCF', label: 'First Cycle Formative' },
  { code: 'MFCF', label: 'Minimum First Cycle Formative' },
  { code: 'HFCF', label: 'Hatch Year First Cycle Formative' },
  { code: 'AFCF', label: 'Adult First Cycle Formative' },
  { code: 'FPA', label: 'First Prealternate' },
  { code: 'MFPA', label: 'Minimum First Prealternate' },
  { code: 'FCA', label: 'First Cycle Alternate' },
  { code: 'MFCA', label: 'Minimum First Cycle Alternate' },
  { code: 'FPS', label: 'First Presupplemental' },
  { code: 'MFPS', label: 'Minimum First Presupplemental' },
  { code: 'FCS', label: 'First Cycle Supplemental' },
  { code: 'MFCS', label: 'Minimum First Cycle Supplemental' },
  { code: 'FCU', label: 'First Cycle Unknown' },
  { code: 'FPU', label: 'First Cycle Unknown Molt' },
  { code: 'SPB', label: 'Second Prebasic' },
  { code: 'MSPB', label: 'Minimum Second Prebasic' },
  { code: 'SCB', label: 'Second Cycle Basic' },
  { code: 'MSCB', label: 'Minimum Second Cycle Basic' },
  { code: 'SPA', label: 'Second Prealternate' },
  { code: 'MSPA', label: 'Minimum Second Prealternate' },
  { code: 'SCA', label: 'Second Cycle Alternate' },
  { code: 'MSCA', label: 'Minimum Second Cycle Alternate' },
  { code: 'SPS', label: 'Second Presupplemental' },
  { code: 'MSPS', label: 'Minimum Second Presupplemental' },
  { code: 'SCS', label: 'Second Cycle Supplemental' },
  { code: 'MSCS', label: 'Minimum Second Cycle Supplemental' },
  { code: 'SCU', label: 'Second Cycle Unknown' },
  { code: 'SPU', label: 'Second Cycle Unknown Molt' },
  { code: 'TPB', label: 'Third Prebasic' },
  { code: 'MTPB', label: 'Minimum Third Prebasic' },
  { code: 'TCB', label: 'Third Cycle Basic' },
  { code: 'MTCB', label: 'Minimum Third Cycle Basic' },
  { code: 'TPA', label: 'Third Prealternate' },
  { code: 'TCA', label: 'Third Cycle Alternate' },
  { code: 'TCU', label: 'Third Cycle Unknown' },
  { code: 'TPU', label: 'Third Cycle Unknown Molt' },
  { code: 'DPB', label: 'Definitive Prebasic' },
  { code: 'DCB', label: 'Definitive Cycle Basic' },
  { code: 'DPA', label: 'Definitive Prealternate' },
  { code: 'DPS', label: 'Definitive Presupplemental' },
  { code: 'DCS', label: 'Definitive Cycle Supplemental' },
  { code: 'DCU', label: 'Definitive Cycle Unknown' },
  { code: 'DPU', label: 'Definitive Cycle Unknown Molt' },
  { code: 'UPB', label: 'Unknown Prebasic' },
  { code: 'UCB', label: 'Unknown Cycle Basic' },
  { code: 'UCA', label: 'Unknown Cycle Alternate' },
  { code: 'UPA', label: 'Unknown Prealternate' },
  { code: 'UPU', label: 'Unknown Cycle Unknown Molt' },
  { code: 'UUU', label: 'Unknown Unknown Unknown' },
  { code: 'OT', label: 'Other (add note)' },
]

export const CAPTURE_STATUS_CODES: CodeOption[] = [
  { code: '1', label: 'New band' },
  { code: 'U', label: 'Unbanded' },
  { code: 'R', label: 'Recapture (same station)' },
  { code: 'F', label: 'Foreign recapture' },
  { code: '4', label: 'Band changed' },
  { code: '5', label: 'Band removed' },
  { code: '6', label: 'Recapture (band added)' },
  { code: '8', label: 'Band lost' },
  // Band-fate markers — the MAPS IBP capture-code letters for a band removed from
  // inventory without a bird encounter. These are recorded as their own rows on the
  // Banding Sheet (no bird data) and count as neither new bands nor recaptures.
  // We deliberately key these to the IBP letters, NOT the BBL numerics 4/8, because
  // 4/8 already mean recapture in this app. See docs/apps/field/research-destroyed-bands.md.
  { code: 'D', label: 'Band destroyed' },
  { code: 'L', label: 'Band lost' },
  { code: 'X', label: 'Other' },
]

export const SKULL_CODES: CodeOption[] = [
  { code: '0', label: 'No skull visible' },
  { code: '1', label: 'Partial pneumatization' },
  { code: '2', label: '~25% complete' },
  { code: '3', label: '~50% complete' },
  { code: '4', label: '~75% complete' },
  { code: '5', label: '~90% complete' },
  { code: '6', label: 'Fully complete' },
  { code: '8', label: 'Invisible' },
]

export const FAT_CODES: CodeOption[] = [
  { code: '0', label: 'None' },
  { code: '1', label: 'Trace' },
  { code: '2', label: 'Light' },
  { code: '3', label: 'Half' },
  { code: '4', label: 'Filled' },
  { code: '5', label: 'Bulging' },
  { code: '6', label: 'Greatly Bulging' },
  { code: '7', label: 'Very Excessive' },
]

export const CP_CODES: CodeOption[] = [
  { code: '0', label: 'None' },
  { code: '1', label: 'Small' },
  { code: '2', label: 'Medium' },
  { code: '3', label: 'Large' },
]

export const BP_CODES: CodeOption[] = [
  { code: '0', label: 'None' },
  { code: '1', label: 'Smooth' },
  { code: '2', label: 'Vascularized' },
  { code: '3', label: 'Heavy Vascularized' },
  { code: '4', label: 'Wrinkled' },
  { code: '5', label: 'Feathered' },
]

export const MOLT_CODES: CodeOption[] = [
  { code: '0', label: 'No molt' },
  { code: '1', label: 'Light molt' },
  { code: '2', label: 'Medium molt' },
  { code: '3', label: 'Heavy molt' },
  { code: '4', label: 'Very heavy molt' },
]

export const FF_MOLT_CODES: CodeOption[] = [
  { code: 'N', label: 'None' },
  { code: 'S', label: 'Symmetrical' },
  { code: 'A', label: 'Asymmetrical' },
  { code: 'J', label: 'Juv growth' },
]

export const FF_WEAR_CODES: CodeOption[] = [
  { code: '0', label: 'None' },
  { code: '1', label: 'Slight' },
  { code: '2', label: 'Light' },
  { code: '3', label: 'Moderate' },
  { code: '4', label: 'Heavy' },
  { code: '5', label: 'Excessive' },
]

export const JUV_BODY_PLUMAGE_CODES: CodeOption[] = [
  { code: '0', label: 'None' },
  { code: '1', label: '< 1/2' },
  { code: '2', label: '> 1/2' },
  { code: '3', label: 'Heavy' },
]

// Status codes for the "Banding Status" field on the Banding Sheet, which records the outcome of a banding attempt. These are a mix of MAPS IBP capture-code letters and USGS BBL status codes, as documented in the MAPS Manual and USGS BBL website. See docs/apps/field/research-destroyed-bands.md for details.
// - USGS BBL Status and Information Codes ([website](https://www.pwrc.usgs.gov/BBL/Bander_Portal/login/birdstatus.php))
// - [MAPS Banding Codes Summary 2026](https://github.com/kenshih/birdnerd/blob/a48305487337241bffb3585393e20cd866d3ed0b/docs/resources/MAPS-Materials-MAPS-Banding-Codes-Summary-2026.pdf)
// - [gh issue #1](https://github.com/kenshih/birdnerd/issues/1)
// Labels carry only the description; the code prefix (e.g. "300 — ") is added by the view.
export const BIRD_STATUS_CODES: CodeOption[] = [
  { code: '300', label: 'healthy, released w/metal band' },
  { code: '301', label: 'healthy, released w/metal band and color band' },
  { code: '318', label: 'healthy, released w/metal band, and blood sampled' },
  { code: '319', label: 'healthy, released w/metal band with color band, and blood sampled' },
  { code: '500', label: 'injured, stressed, deformed, or sick bird released w/metal band' },
  { code: '700', label: 'rehabilitated bird released with metal band' },
  { code: '---', label: 'banding mortality' },
]

/** Set of the predefined status codes — used to detect a write-in (custom) value. */
export const BIRD_STATUS_CODE_VALUES = new Set(BIRD_STATUS_CODES.map(c => c.code))

// Disposition codes (from Hallie's doc)
export const DISPOSITION_CODES: CodeOption[] = [
  { code: 'M', label: 'Mortality' },
  { code: 'O', label: 'Old/heal?TBA injury' },
  { code: 'I', label: 'Illness/Disease' },
  { code: 'S', label: 'Stress/?TBA' },
  { code: 'E', label: 'Eye Injury' },
  { code: 'T', label: 'Tongue Injury' },
  { code: 'W', label: 'Wing Injury' },
  { code: 'B', label: 'Body Injury' },
  { code: 'L', label: 'Leg Injury' },
  { code: 'P', label: 'Predation' },
  { code: 'D', label: 'Dead' },
  { code: 'X', label: 'Ectoparasite' },
]

// Molt Limits & Plumage codes
export const MOLT_LIMITS_CODES: CodeOption[] = [
  { code: 'J', label: 'Juvenal' },
  { code: 'L', label: 'Limit' },
  { code: 'F', label: 'Formative' },
  { code: 'B', label: 'Basic' },
  { code: 'R', label: 'Retained' },
  { code: 'M', label: 'Molt' },
  { code: 'A', label: 'Alternate' },
  { code: 'N', label: 'Non-juvenal' },
  { code: 'X', label: 'Mixed Formative & Alternate' },
  { code: 'U', label: 'Unknown' },
]

// Present Condition (recapture)
export const PRESENT_CONDITION_CODES: CodeOption[] = [
  { code: 'H', label: 'Healthy' },
  { code: 'I', label: 'Injured' },
  { code: 'S', label: 'Sick/Stressed' },
  { code: 'D', label: 'Dead' },
]
