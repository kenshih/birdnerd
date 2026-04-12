import { LEFT_SECTION_FIELDS, rowDraftHasContent } from '../rowDraftSchema'
import type { RowBox, RowDraft } from '../types'

export interface RowExportRecord {
  rowNumber: number
  reviewStatus: RowDraft['status']
  banderInitials: string
  code: string
  bandNumber: string
  speciesCode: string
  age: string
  howAged: string
  wrpCode: string
  sex: string
  howSexed: string
  skull: string
  cloacalProtuberance: string
  broodPatch: string
  fat: string
  bodyMolt: string
  flightFeatherMolt: string
  flightFeatherWear: string
  juvenileBodyPlumage: string
}

const EXPORT_COLUMNS: Array<keyof RowExportRecord> = [
  'rowNumber',
  'reviewStatus',
  ...LEFT_SECTION_FIELDS.map(({ key }) => key),
]

function escapeCsvValue(value: string | number): string {
  const stringValue = String(value)
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

/** Maps OCR row boxes into exportable row records, filtering out untouched rows. */
export function getExportRecords(rowBoxes: RowBox[]): RowExportRecord[] {
  return rowBoxes
    .map((rowBox, index) => ({ rowBox, rowNumber: index + 1 }))
    .filter(({ rowBox }) => rowDraftHasContent(rowBox.draft))
    .map(({ rowBox, rowNumber }) => ({
      rowNumber,
      reviewStatus: rowBox.draft.status,
      banderInitials: rowBox.draft.banderInitials,
      code: rowBox.draft.code,
      bandNumber: rowBox.draft.bandNumber,
      speciesCode: rowBox.draft.speciesCode,
      age: rowBox.draft.age,
      howAged: rowBox.draft.howAged,
      wrpCode: rowBox.draft.wrpCode,
      sex: rowBox.draft.sex,
      howSexed: rowBox.draft.howSexed,
      skull: rowBox.draft.skull,
      cloacalProtuberance: rowBox.draft.cloacalProtuberance,
      broodPatch: rowBox.draft.broodPatch,
      fat: rowBox.draft.fat,
      bodyMolt: rowBox.draft.bodyMolt,
      flightFeatherMolt: rowBox.draft.flightFeatherMolt,
      flightFeatherWear: rowBox.draft.flightFeatherWear,
      juvenileBodyPlumage: rowBox.draft.juvenileBodyPlumage,
    }))
}

/** Converts export records into a CSV string using the current OCR review column order. */
export function getExportCsv(records: RowExportRecord[]): string {
  const header = EXPORT_COLUMNS.map(escapeCsvValue).join(',')
  const rows = records.map((record) =>
    EXPORT_COLUMNS.map((column) => escapeCsvValue(record[column])).join(',')
  )

  return [header, ...rows].join('\n')
}
