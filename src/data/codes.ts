// MAPS/IBP standard banding codes
// TODO: verify against official IBP code tables

export const AGE_CODES = [
  { code: '1', label: 'After Hatch Year (AHY)' },
  { code: '2', label: 'Hatch Year (HY)' },
  { code: '4', label: 'After Second Year (ASY)' },
  { code: '5', label: 'Second Year (SY)' },
  { code: '6', label: 'After Third Year (ATY)' },
  { code: '7', label: 'Third Year (TY)' },
  { code: '8', label: 'Local (L)' },
  { code: 'U', label: 'Unknown' },
]

export const SEX_CODES = [
  { code: 'M', label: 'Male' },
  { code: 'F', label: 'Female' },
  { code: 'U', label: 'Unknown' },
]

export const SKULL_CODES = [
  { code: '0', label: '0 — No skull visible' },
  { code: '1', label: '1 — Partial pneumatization' },
  { code: '2', label: '2 — ~25% complete' },
  { code: '3', label: '3 — ~50% complete' },
  { code: '4', label: '4 — ~75% complete' },
  { code: '5', label: '5 — ~90% complete' },
  { code: '6', label: '6 — Fully complete' },
  { code: 'X', label: 'X — Not checked' },
]

export const FAT_CODES = [
  { code: '0', label: '0 — No fat' },
  { code: '1', label: '1 — Trace' },
  { code: '2', label: '2 — Light' },
  { code: '3', label: '3 — Moderate' },
  { code: '4', label: '4 — Heavy' },
  { code: '5', label: '5 — Very heavy' },
  { code: 'T', label: 'T — Turgid' },
]

export const MOLT_CODES = [
  { code: '0', label: '0 — No molt' },
  { code: '1', label: '1 — Light molt' },
  { code: '2', label: '2 — Moderate molt' },
  { code: '3', label: '3 — Heavy molt' },
  { code: 'J', label: 'J — Juvenile plumage' },
  { code: 'P', label: 'P — Prejuvenile' },
  { code: 'F', label: 'F — Formative' },
]

export const CAPTURE_STATUS_CODES = [
  { code: 'N', label: 'N — New' },
  { code: 'R', label: 'R — Recapture (same station)' },
  { code: 'F', label: 'F — Foreign recapture' },
  { code: 'U', label: 'U — Unbanded' },
]

export const STATIONS = [
  { code: 'GCFS', name: 'Galindo Creek Field Station' },
  { code: 'MCFS', name: 'Mitchell Canyon Field Station' },
]
