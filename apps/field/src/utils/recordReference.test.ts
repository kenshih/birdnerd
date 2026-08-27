import { describe, expect, it } from 'vitest'
import { legacyBandLabel, recordBandReference, unresolvedManagedBandLabel } from './recordReference'

describe('unresolvedManagedBandLabel', () => {
  it('keeps the immutable Band-number snapshot beside an unresolved ID', () => {
    expect(unresolvedManagedBandLabel('1154-81501', 'missing-band-id'))
      .toBe('Unresolved managed Band — 1154-81501 (ID: missing-band-id)')
  })

  it('does not invent a missing Band-number snapshot', () => {
    expect(unresolvedManagedBandLabel(undefined, 'missing-band-id'))
      .toBe('Unresolved managed Band (ID: missing-band-id)')
  })
})

describe('recordBandReference', () => {
  it('keeps a historical raw Band number explicitly unresolved', () => {
    expect(recordBandReference({ band_number: '1154-81501' })).toEqual({
      mode: 'legacy', bandNumber: '1154-81501', bandId: '',
    })
    expect(legacyBandLabel('1154-81501')).toBe('Historical Band (unresolved) — 1154-81501')
  })

  it('uses the explicit current selection when one is present', () => {
    expect(recordBandReference({
      band_number: 'old-value',
      band_selection: { kind: 'managed', band_id: 'band-id', band_number: '1154-81502' },
    })).toEqual({ mode: 'managed', bandNumber: '1154-81502', bandId: 'band-id' })
  })
})
