export interface CodeOption {
  code: string
  label: string
}

export const AGE_CODES: CodeOption[] = [
  { code: '1', label: 'After Hatch Year (AHY)' },
  { code: '2', label: 'Hatch Year (HY)' },
  { code: '4', label: 'After Second Year (ASY)' },
  { code: '5', label: 'Second Year (SY)' },
  { code: '6', label: 'After Third Year (ATY)' },
  { code: '7', label: 'Third Year (TY)' },
  { code: '8', label: 'Local (L)' },
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

export const CAPTURE_STATUS_CODES: CodeOption[] = [
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

export const SKULL_CODES: CodeOption[] = [
  { code: '0', label: '0 — No skull visible' },
  { code: '1', label: '1 — Partial pneumatization' },
  { code: '2', label: '2 — ~25% complete' },
  { code: '3', label: '3 — ~50% complete' },
  { code: '4', label: '4 — ~75% complete' },
  { code: '5', label: '5 — ~90% complete' },
  { code: '6', label: '6 — Fully complete' },
  { code: 'X', label: 'X — Not checked' },
]

export const FAT_CODES: CodeOption[] = [
  { code: '0', label: '0 — None' },
  { code: '1', label: '1 — Trace' },
  { code: '2', label: '2 — Light' },
  { code: '3', label: '3 — Half' },
  { code: '4', label: '4 — Filled' },
  { code: '5', label: '5 — Bulging' },
  { code: '6', label: '6 — Greatly Bulging' },
  { code: '7', label: '7 — Very Excessive' },
]

export const CP_CODES: CodeOption[] = [
  { code: '0', label: '0 — None' },
  { code: '1', label: '1 — Small' },
  { code: '2', label: '2 — Medium' },
  { code: '3', label: '3 — Large' },
]

export const BP_CODES: CodeOption[] = [
  { code: '0', label: '0 — None' },
  { code: '1', label: '1 — Smooth' },
  { code: '2', label: '2 — Vascularized' },
  { code: '3', label: '3 — Heavy Vascularized' },
  { code: '4', label: '4 — Wrinkled' },
  { code: '5', label: '5 — Feathered' },
]

export const MOLT_CODES: CodeOption[] = [
  { code: '0', label: '0 — No molt' },
  { code: '1', label: '1 — Light molt' },
  { code: '2', label: '2 — Medium molt' },
  { code: '3', label: '3 — Heavy molt' },
  { code: '4', label: '4 — Very heavy molt' },
]

export const FF_MOLT_CODES: CodeOption[] = [
  { code: 'N', label: 'N — None' },
  { code: 'S', label: 'S — Symmetrical' },
  { code: 'A', label: 'A — Asymmetrical' },
  { code: 'J', label: 'J — Juv growth' },
]

export const FF_WEAR_CODES: CodeOption[] = [
  { code: '0', label: '0 — None' },
  { code: '1', label: '1 — Slight' },
  { code: '2', label: '2 — Light' },
  { code: '3', label: '3 — Moderate' },
  { code: '4', label: '4 — Heavy' },
  { code: '5', label: '5 — Excessive' },
]

export const JUV_BODY_PLUMAGE_CODES: CodeOption[] = [
  { code: '0', label: '0 — None' },
  { code: '1', label: '1 — < 1/2' },
  { code: '2', label: '2 — > 1/2' },
  { code: '3', label: '3 — Heavy' },
]
