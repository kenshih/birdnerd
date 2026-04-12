import type { RowDraft } from './types'

export type RowDraftFieldKey = Exclude<keyof RowDraft, 'status'>

export interface RowDraftFieldConfig {
  key: RowDraftFieldKey
  label: string
  placeholder?: string
  compact?: boolean
  wide?: boolean
  exportLabel: string
}

export const LEFT_SECTION_FIELDS: RowDraftFieldConfig[] = [
  { key: 'banderInitials', label: "Bander's Initials", placeholder: 'e.g. HD', compact: true, exportLabel: 'banderInitials' },
  { key: 'code', label: 'Code', placeholder: 'e.g. N or R', compact: true, exportLabel: 'code' },
  { key: 'bandNumber', label: 'Band Number', placeholder: 'e.g. 1231-45678', wide: true, exportLabel: 'bandNumber' },
  { key: 'speciesCode', label: 'Species Alpha', placeholder: 'e.g. SOSP', compact: true, exportLabel: 'speciesCode' },
  { key: 'age', label: 'Age', placeholder: 'e.g. HY', compact: true, exportLabel: 'age' },
  { key: 'howAged', label: 'How Aged', placeholder: 'e.g. CP', compact: true, exportLabel: 'howAged' },
  { key: 'wrpCode', label: 'WRP Code', placeholder: 'e.g. DPAM', compact: true, exportLabel: 'wrpCode' },
  { key: 'sex', label: 'Sex', placeholder: 'e.g. M', compact: true, exportLabel: 'sex' },
  { key: 'howSexed', label: 'How Sexed', placeholder: 'e.g. BP', compact: true, exportLabel: 'howSexed' },
  { key: 'skull', label: 'Skull', placeholder: 'e.g. 3', compact: true, exportLabel: 'skull' },
  { key: 'cloacalProtuberance', label: 'Cl. Prot.', placeholder: 'e.g. 2', compact: true, exportLabel: 'cloacalProtuberance' },
  { key: 'broodPatch', label: 'Br. Patch', placeholder: 'e.g. 3', compact: true, exportLabel: 'broodPatch' },
  { key: 'fat', label: 'Fat', placeholder: 'e.g. 1', compact: true, exportLabel: 'fat' },
  { key: 'bodyMolt', label: 'Body Mlt', placeholder: 'e.g. 0', compact: true, exportLabel: 'bodyMolt' },
  { key: 'flightFeatherMolt', label: 'FF Molt', placeholder: 'e.g. N', compact: true, exportLabel: 'flightFeatherMolt' },
  { key: 'flightFeatherWear', label: 'FF Wear', placeholder: 'e.g. L', compact: true, exportLabel: 'flightFeatherWear' },
  { key: 'juvenileBodyPlumage', label: 'Juv Body Pl', placeholder: 'e.g. J', compact: true, exportLabel: 'juvenileBodyPlumage' },
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
