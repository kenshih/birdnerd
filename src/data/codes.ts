// MAPS/IBP standard banding codes
// Curated from Hallie's station subsets (not full LOOKUPS)

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

// Hallie's curated How Aged codes (19)
export const HOW_AGED_CODES = [
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

// Hallie's curated How Sexed codes (11)
export const HOW_SEXED_CODES = [
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

// Hallie's station WRP subset (57 + Other)
export const WRP_CODES = [
  { code: 'FPJ', label: 'First Prejuvenile' },
  { code: 'FCJ', label: 'First Cycle Juvenal' },
  { code: 'FPX', label: 'First Pre-auxiliary' },
  { code: 'FCX', label: 'First Cycle Auxiliary' },
  { code: 'FPF', label: 'First Preformative' },
  { code: 'MFPF', label: 'M- First Preformative' },
  { code: 'FCF', label: 'First Cycle Formative' },
  { code: 'MFCF', label: 'M- First Cycle Formative' },
  { code: 'HFCF', label: 'H- First Cycle Formative' },
  { code: 'AFCF', label: 'A- First Cycle Formative' },
  { code: 'FPA', label: 'First Prealternate' },
  { code: 'MFPA', label: 'M- First Prealternate' },
  { code: 'FCA', label: 'First Cycle Alternate' },
  { code: 'MFCA', label: 'M- First Cycle Alternate' },
  { code: 'FPS', label: 'First Presupplemental' },
  { code: 'MFPS', label: 'M- First Presupplemental' },
  { code: 'FCS', label: 'First Cycle Supplemental' },
  { code: 'MFCS', label: 'M- First Cycle Supplemental' },
  { code: 'FCU', label: 'First Cycle Unknown' },
  { code: 'FPU', label: 'First Cycle Unknown Molt' },
  { code: 'SPB', label: 'Second Prebasic' },
  { code: 'MSPB', label: 'M- Second Prebasic' },
  { code: 'SCB', label: 'Second Cycle Basic' },
  { code: 'MSCB', label: 'M- Second Cycle Basic' },
  { code: 'SPA', label: 'Second Prealternate' },
  { code: 'MSPA', label: 'M- Second Prealternate' },
  { code: 'SCA', label: 'Second Cycle Alternate' },
  { code: 'MSCA', label: 'M- Second Cycle Alternate' },
  { code: 'SPS', label: 'Second Presupplemental' },
  { code: 'MSPS', label: 'M- Second Presupplemental' },
  { code: 'SCS', label: 'Second Cycle Supplemental' },
  { code: 'MSCS', label: 'M- Second Cycle Supplemental' },
  { code: 'SCU', label: 'Second Cycle Unknown' },
  { code: 'SPU', label: 'Second Cycle Unknown Molt' },
  { code: 'TPB', label: 'Third Prebasic' },
  { code: 'MTPB', label: 'M- Third Prebasic' },
  { code: 'TCB', label: 'Third Cycle Basic' },
  { code: 'MTCB', label: 'M- Third Cycle Basic' },
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

// Capture Status / Code (from Hallie's doc)
export const CAPTURE_STATUS_CODES = [
  { code: '1', label: '1 — New band' },
  { code: 'U', label: 'U — Unbanded' },
  { code: 'R', label: 'R — Recapture (same station)' },
  { code: 'F', label: 'F — Foreign recapture' },
  { code: '4', label: '4 — Band changed' },
  { code: '5', label: '5 — Band removed' },
  { code: '6', label: '6 — Recapture (band added)' },
  { code: '8', label: '8 — Band lost' },
  { code: 'X', label: 'X — Other' },
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

// Hallie's Fat codes (0-7)
export const FAT_CODES = [
  { code: '0', label: '0 — None' },
  { code: '1', label: '1 — Trace' },
  { code: '2', label: '2 — Light' },
  { code: '3', label: '3 — Half' },
  { code: '4', label: '4 — Filled' },
  { code: '5', label: '5 — Bulging' },
  { code: '6', label: '6 — Greatly Bulging' },
  { code: '7', label: '7 — Very Excessive' },
]

// Cloacal Protuberance (0-3)
export const CP_CODES = [
  { code: '0', label: '0 — None' },
  { code: '1', label: '1 — Small' },
  { code: '2', label: '2 — Medium' },
  { code: '3', label: '3 — Large' },
]

// Brood Patch (0-5)
export const BP_CODES = [
  { code: '0', label: '0 — None' },
  { code: '1', label: '1 — Smooth' },
  { code: '2', label: '2 — Vascularized' },
  { code: '3', label: '3 — Heavy Vascularized' },
  { code: '4', label: '4 — Wrinkled' },
  { code: '5', label: '5 — Feathered' },
]

export const MOLT_CODES = [
  { code: '0', label: '0 — No molt' },
  { code: '1', label: '1 — Light molt' },
  { code: '2', label: '2 — Medium molt' },
  { code: '3', label: '3 — Heavy molt' },
  { code: '4', label: '4 — Very heavy molt' },
]

// FF Wear (0-5)
export const FF_WEAR_CODES = [
  { code: '0', label: '0 — None' },
  { code: '1', label: '1 — Slight' },
  { code: '2', label: '2 — Light' },
  { code: '3', label: '3 — Moderate' },
  { code: '4', label: '4 — Heavy' },
  { code: '5', label: '5 — Excessive' },
]

// Bird Status codes (from Hallie's doc)
export const BIRD_STATUS_CODES = [
  { code: '300', label: '300 — Normal, banded, released' },
  { code: '301', label: '301 — Color-banded' },
  { code: '318', label: '318 — Blood sample taken' },
  { code: '319', label: '319 — Color-banded + blood sample' },
  { code: '333', label: '333 — Recaptured, no blood' },
  { code: '334', label: '334 — Recaptured + blood sample' },
  { code: '380', label: '380 — Released unbanded' },
  { code: '500', label: '500 — Injured, released' },
  { code: '700', label: '700 — Unbanded observation' },
  { code: '---', label: '--- — Mortality' },
  { code: 'OT', label: 'Other (add note)' },
]

// Disposition codes (from Hallie's doc)
export const DISPOSITION_CODES = [
  { code: 'M', label: 'M — Mortality' },
  { code: 'O', label: 'O — Old injury' },
  { code: 'I', label: 'I — Injured' },
  { code: 'S', label: 'S — Stressed' },
  { code: 'E', label: 'E — Escaped' },
  { code: 'T', label: 'T — Transferred' },
  { code: 'W', label: 'W — Wing problem' },
  { code: 'B', label: 'B — Band problem' },
  { code: 'L', label: 'L — Leg problem' },
  { code: 'P', label: 'P — Parasites' },
  { code: 'D', label: 'D — Disease' },
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
  { code: 'U', label: 'U — Unknown' },
]

// Juvenile Body Plumage (0-3)
export const JUV_BODY_PLUMAGE_CODES = [
  { code: '0', label: '0 — None' },
  { code: '1', label: '1 — Light' },
  { code: '2', label: '2 — Medium' },
  { code: '3', label: '3 — Heavy' },
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
  { code: '7', label: '7' },
  { code: '7A', label: '7A' },
  { code: '7B', label: '7B' },
  { code: '8', label: '8' },
  { code: '9', label: '9' },
]

// Band Type — TODO: confirm full list with Hallie
export const BAND_TYPE_CODES = [
  { code: 'Standard', label: 'Standard' },
  { code: 'Buffy', label: 'Buffy' },
  { code: 'Giant', label: 'Giant' },
  { code: 'Lockout', label: 'Lockout' },
]

export const STATIONS = [
  { code: 'GCBS', name: 'Galindo Creek Banding Station' },
  { code: 'MCFS', name: 'Mitchell Canyon Field Station' },
]

export const PROTOCOL_CODES = [
  { code: 'MAPS', label: 'MAPS' },
  { code: 'Non-MAPS', label: 'Non-MAPS' },
  { code: 'Burrowing Owl', label: 'Burrowing Owl Banding' },
  { code: 'Rehabbed-Bird', label: 'Rehabbed-Bird Banding' },
  { code: 'Saw-whet Owl', label: 'Saw-whet Owl Banding' },
]
