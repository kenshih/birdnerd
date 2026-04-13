import type { NormalizedRect } from '../types'
import { getTemplateSegmentRect } from './rowTemplate'
import { composeNormalizedRect } from '../utils/rect'

export type FocusedOcrField = 'speciesCode' | 'bandNumber'

interface FieldWindowDefinition {
  label: string
  rect: NormalizedRect
}

/**
 * Layout-specific field windows inside a selected row.
 * These are intentionally simple first-pass approximations for the known BirdNerd bandsheet layout.
 */
export const FIELD_WINDOWS: Record<FocusedOcrField, FieldWindowDefinition> = {
  bandNumber: {
    label: 'Band Number Window',
    rect: insetRect(getTemplateSegmentRect('bandNumber'), {
      left: 0.02,
      right: -0.14,
    }),
  },
  speciesCode: {
    label: 'Species Code Window',
    rect: insetRect(getTemplateSegmentRect('speciesCode'), {
      left: 0.04,
      right: -0.12,
    }),
  },
}

export function getFieldWindowRect(rowRect: NormalizedRect, field: FocusedOcrField): NormalizedRect {
  return composeNormalizedRect(rowRect, FIELD_WINDOWS[field].rect)
}

function insetRect(
  rect: NormalizedRect,
  insets: { left?: number; right?: number; top?: number; bottom?: number },
): NormalizedRect {
  const left = insets.left ?? 0
  const right = insets.right ?? 0
  const top = insets.top ?? 0
  const bottom = insets.bottom ?? 0

  return {
    x: rect.x + left * rect.width,
    y: rect.y + top * rect.height,
    width: rect.width * (1 - left - right),
    height: rect.height * (1 - top - bottom),
  }
}
