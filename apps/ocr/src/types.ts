export interface NormalizedRect {
  x: number
  y: number
  width: number
  height: number
}

export interface RowBox {
  id: string
  rect: NormalizedRect
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
