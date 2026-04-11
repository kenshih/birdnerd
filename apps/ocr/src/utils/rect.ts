import type { NormalizedRect } from '../types'

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
  return rect.width > 0.01 && rect.height > 0.01
}

export function rectToPercentStyle(rect: NormalizedRect) {
  return {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.width * 100}%`,
    height: `${rect.height * 100}%`,
  }
}
