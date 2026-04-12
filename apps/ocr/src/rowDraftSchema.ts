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
  type CodeOption,
} from '@birdnerd/shared'
import type { RowDraft } from './types'

export type RowDraftFieldKey = Exclude<keyof RowDraft, 'status'>

export interface RowDraftFieldConfig {
  key: RowDraftFieldKey
  label: string
  placeholder?: string
  compact?: boolean
  wide?: boolean
  exportLabel: string
  options?: CodeOption[]
}

export const LEFT_SECTION_FIELDS: RowDraftFieldConfig[] = [
  { key: 'banderInitials', label: "Bander's Initials", placeholder: 'e.g. HD', compact: true, exportLabel: 'banderInitials' },
  { key: 'code', label: 'Code', placeholder: 'e.g. N or R', compact: true, exportLabel: 'code', options: CAPTURE_STATUS_CODES },
  { key: 'bandNumber', label: 'Band Number', placeholder: 'e.g. 1231-45678', wide: true, exportLabel: 'bandNumber' },
  { key: 'speciesCode', label: 'Species Alpha', placeholder: 'e.g. SOSP', compact: true, exportLabel: 'speciesCode' },
  { key: 'age', label: 'Age', placeholder: 'e.g. HY', compact: true, exportLabel: 'age', options: AGE_CODES },
  { key: 'howAged', label: 'How Aged', placeholder: 'e.g. CP', compact: true, exportLabel: 'howAged', options: HOW_AGED_CODES },
  { key: 'wrpCode', label: 'WRP Code', placeholder: 'e.g. DPAM', compact: true, exportLabel: 'wrpCode', options: WRP_CODES },
  { key: 'sex', label: 'Sex', placeholder: 'e.g. M', compact: true, exportLabel: 'sex', options: SEX_CODES },
  { key: 'howSexed', label: 'How Sexed', placeholder: 'e.g. BP', compact: true, exportLabel: 'howSexed', options: HOW_SEXED_CODES },
  { key: 'skull', label: 'Skull', placeholder: 'e.g. 3', compact: true, exportLabel: 'skull', options: SKULL_CODES },
  { key: 'cloacalProtuberance', label: 'Cl. Prot.', placeholder: 'e.g. 2', compact: true, exportLabel: 'cloacalProtuberance', options: CP_CODES },
  { key: 'broodPatch', label: 'Br. Patch', placeholder: 'e.g. 3', compact: true, exportLabel: 'broodPatch', options: BP_CODES },
  { key: 'fat', label: 'Fat', placeholder: 'e.g. 1', compact: true, exportLabel: 'fat', options: FAT_CODES },
  { key: 'bodyMolt', label: 'Body Mlt', placeholder: 'e.g. 0', compact: true, exportLabel: 'bodyMolt', options: MOLT_CODES },
  { key: 'flightFeatherMolt', label: 'FF Molt', placeholder: 'e.g. N', compact: true, exportLabel: 'flightFeatherMolt', options: FF_MOLT_CODES },
  { key: 'flightFeatherWear', label: 'FF Wear', placeholder: 'e.g. L', compact: true, exportLabel: 'flightFeatherWear', options: FF_WEAR_CODES },
  { key: 'juvenileBodyPlumage', label: 'Juv Body Pl', placeholder: 'e.g. J', compact: true, exportLabel: 'juvenileBodyPlumage', options: JUV_BODY_PLUMAGE_CODES },
]

export function createEmptyRowDraft(): RowDraft {
  return {
    banderInitials: '',
    code: '',
    bandNumber: '',
    speciesCode: '',
    age: '',
    howAged: '',
    howSexed: '',
    wrpCode: '',
    sex: '',
    skull: '',
    cloacalProtuberance: '',
    broodPatch: '',
    fat: '',
    bodyMolt: '',
    flightFeatherMolt: '',
    flightFeatherWear: '',
    juvenileBodyPlumage: '',
    status: 'unreviewed',
  }
}

export function rowDraftHasContent(draft: RowDraft): boolean {
  return LEFT_SECTION_FIELDS.some(({ key }) => draft[key].trim() !== '')
}
