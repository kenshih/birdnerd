import { AGE_CODES, CAPTURE_STATUS_CODES, SEX_CODES } from '@birdnerd/shared'
import type { RowDraftFieldKey } from '../rowDraftSchema'

export interface OcrDraftSuggestion {
  field: RowDraftFieldKey
  value: string
  reason: string
}

/** Derives a few conservative draft suggestions from raw OCR text for early viability testing. */
export function mapRecognizedTextToDraft(text: string): OcrDraftSuggestion[] {
  const normalized = text
    .toUpperCase()
    .replace(/[_|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) {
    return []
  }

  const suggestions: OcrDraftSuggestion[] = []
  const seenFields = new Set<RowDraftFieldKey>()

  const addSuggestion = (field: RowDraftFieldKey, value: string, reason: string) => {
    if (!value || seenFields.has(field)) return
    seenFields.add(field)
    suggestions.push({ field, value, reason })
  }

  const bandNumberMatch = normalized.match(/\b\d{3,4}-?\d{4,6}\b/)
  if (bandNumberMatch) {
    addSuggestion('bandNumber', bandNumberMatch[0], 'Detected band-number-like digit pattern.')
  }

  const speciesMatch = normalized.match(/\b[A-Z]{4}\b/)
  if (speciesMatch) {
    addSuggestion('speciesCode', speciesMatch[0], 'Detected four-letter alpha-code-like token.')
  }

  const codeOptions = new Set(CAPTURE_STATUS_CODES.map((option) => option.code.toUpperCase()))
  const ageOptions = new Set(AGE_CODES.map((option) => option.code.toUpperCase()))
  const sexOptions = new Set(SEX_CODES.map((option) => option.code.toUpperCase()))

  for (const token of normalized.split(' ')) {
    if (codeOptions.has(token)) {
      addSuggestion('code', token, 'Matched a known capture status code.')
    }

    if (ageOptions.has(token)) {
      addSuggestion('age', token, 'Matched a known age code.')
    }

    if (sexOptions.has(token)) {
      addSuggestion('sex', token, 'Matched a known sex code.')
    }
  }

  return suggestions
}

export function mapFocusedRecognizedTextToDraft(
  field: RowDraftFieldKey,
  text: string,
): OcrDraftSuggestion[] {
  const normalized = text
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) {
    return []
  }

  switch (field) {
    case 'speciesCode': {
      const value = normalized.replace(/[^A-Z]/g, '').slice(0, 4)
      return value
        ? [{ field, value, reason: 'Focused OCR test using uppercase alpha-code constraints.' }]
        : []
    }
    case 'bandNumber': {
      const value = normalized.replace(/[^0-9-]/g, '')
      return value
        ? [{ field, value, reason: 'Focused OCR test using band-number character constraints.' }]
        : []
    }
    default:
      return []
  }
}
