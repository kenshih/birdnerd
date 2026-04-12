export interface NormalizedRect {
  x: number
  y: number
  width: number
  height: number
}

export interface RowBox {
  id: string
  rect: NormalizedRect
  draft: RowDraft
}

export type RowStatus = 'unreviewed' | 'in-progress' | 'reviewed'

export interface RowDraft {
  banderInitials: string
  code: string
  bandNumber: string
  speciesCode: string
  age: string
  howAged: string
  wrpCode: string
  sex: string
  status: RowStatus
}

export type ResizeHandle =
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'top-left'
  | 'top-right'
  | 'bottom-right'
  | 'bottom-left'
