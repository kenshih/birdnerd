import type { NormalizedRect } from '../types'

export type RowTemplateSegmentId =
  | 'banderInitials'
  | 'bandingCode'
  | 'bandNumber'
  | 'writtenSpecies'
  | 'speciesCode'
  | 'age'
  | 'howAged'
  | 'wrpCode'
  | 'sex'
  | 'howSexed'
  | 'skull'
  | 'cloacalProtuberance'
  | 'broodPatch'
  | 'fat'
  | 'bodyMolt'
  | 'flightFeatherMolt'
  | 'flightFeatherWear'
  | 'juvenileBodyPlumage'
  | 'unmodeledRightSide'

interface RowTemplateSegment {
  id: RowTemplateSegmentId
  label: string
  cells: number
  unitWidth: number
}

/**
 * First machine-friendly left-side row template.
 *
 * The segment ordering comes from docs/apps/ocr/row-template.md.
 * The `unitWidth` values are intentionally calibrated estimates, not physical measurements.
 * They exist to turn the row description into reusable geometry we can tune in code.
 */
export const LEFT_ROW_TEMPLATE: RowTemplateSegment[] = [
  { id: 'banderInitials', label: "Bander's Initials", cells: 2, unitWidth: 1 },
  { id: 'bandingCode', label: 'Banding Code', cells: 1, unitWidth: 1 },
  { id: 'bandNumber', label: 'Band Number', cells: 9, unitWidth: 1 },
  { id: 'writtenSpecies', label: 'Written Species', cells: 1, unitWidth: 10 },
  { id: 'speciesCode', label: 'Species Code', cells: 4, unitWidth: 1 },
  { id: 'age', label: 'Age', cells: 1, unitWidth: 1 },
  { id: 'howAged', label: 'How Aged', cells: 2, unitWidth: 1 },
  { id: 'wrpCode', label: 'WRP Code', cells: 4, unitWidth: 1 },
  { id: 'sex', label: 'Sex', cells: 1, unitWidth: 1 },
  { id: 'howSexed', label: 'How Sexed', cells: 2, unitWidth: 1 },
  { id: 'skull', label: 'Skull', cells: 1, unitWidth: 1 },
  { id: 'cloacalProtuberance', label: 'Cl. Prot.', cells: 1, unitWidth: 1 },
  { id: 'broodPatch', label: 'Br. Patch', cells: 1, unitWidth: 1 },
  { id: 'fat', label: 'Fat', cells: 1, unitWidth: 1 },
  { id: 'bodyMolt', label: 'Body Mlt.', cells: 1, unitWidth: 1 },
  { id: 'flightFeatherMolt', label: 'FF Molt', cells: 1, unitWidth: 1 },
  { id: 'flightFeatherWear', label: 'FF Wear', cells: 1, unitWidth: 1 },
  { id: 'juvenileBodyPlumage', label: 'Juv Bdy Pl.', cells: 1, unitWidth: 1 },
  { id: 'unmodeledRightSide', label: 'Unmodeled Right Side', cells: 1, unitWidth: 44 },
]

export function getTemplateSegmentRect(segmentId: RowTemplateSegmentId): NormalizedRect {
  const totalWidth = getTemplateTotalWidth()

  let xUnits = 0
  for (const segment of LEFT_ROW_TEMPLATE) {
    const segmentWidth = segment.cells * segment.unitWidth
    if (segment.id === segmentId) {
      return {
        x: xUnits / totalWidth,
        y: 0.08,
        width: segmentWidth / totalWidth,
        height: 0.84,
      }
    }

    xUnits += segmentWidth
  }

  throw new Error(`Unknown row template segment: ${segmentId}`)
}

function getTemplateTotalWidth() {
  return LEFT_ROW_TEMPLATE.reduce((sum, segment) => sum + segment.cells * segment.unitWidth, 0)
}
