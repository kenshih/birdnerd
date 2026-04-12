import type { NormalizedRect, ResizeHandle } from '../types'

const MIN_MEANINGFUL_RECT_SIZE = 0.003

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function makeNormalizedRect(startX: number, startY: number, endX: number, endY: number): NormalizedRect {
  const left = clamp(Math.min(startX, endX), 0, 1)
  const top = clamp(Math.min(startY, endY), 0, 1)
  const right = clamp(Math.max(startX, endX), 0, 1)
  const bottom = clamp(Math.max(startY, endY), 0, 1)

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}

export function isMeaningfulRect(rect: NormalizedRect) {
  return rect.width > MIN_MEANINGFUL_RECT_SIZE && rect.height > MIN_MEANINGFUL_RECT_SIZE
}

export function rectToPercentStyle(rect: NormalizedRect) {
  return {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.width * 100}%`,
    height: `${rect.height * 100}%`,
  }
}

function getRectEdges(rect: NormalizedRect) {
  return {
    left: rect.x,
    top: rect.y,
    right: rect.x + rect.width,
    bottom: rect.y + rect.height,
  }
}

export function resizeRect(rect: NormalizedRect, handle: ResizeHandle, pointX: number, pointY: number) {
  const edges = getRectEdges(rect)

  let left = edges.left
  let top = edges.top
  let right = edges.right
  let bottom = edges.bottom

  if (handle.includes('left')) left = pointX
  if (handle.includes('right')) right = pointX
  if (handle.includes('top')) top = pointY
  if (handle.includes('bottom')) bottom = pointY

  return makeNormalizedRect(left, top, right, bottom)
}
