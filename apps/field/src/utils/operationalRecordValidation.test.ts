import { describe, expect, it } from 'vitest'

import { validateOperationalRecord } from './operationalRecordValidation'

describe('validateOperationalRecord', () => {
  it('maps event-backed draft fields to their visible warning targets', () => {
    expect(validateOperationalRecord({ sex: 'M', bp: '3' })).toEqual({
      bp: 'Sex=M conflicts with Brood Patch 3/4',
    })
  })

  it('preserves the established non-blocking measurement semantics', () => {
    expect(validateOperationalRecord({ species_code: 'SOSP', sex: 'F', body_mass: '5' })).toEqual({
      body_mass: 'Body mass 5 outside expected female range (16.5–48)',
    })
  })

  it('maps managed-Band context to the controls it qualifies', () => {
    const warnings = validateOperationalRecord(
      { species_code: 'SOSP', capture_code: '1' },
      { band_status: 'deployed', band_size: '3' },
    )

    expect(warnings.capture_code).toMatch(/already deployed/)
    expect(warnings.managed_band).toMatch(/Band size 3 is unusual/)
  })
})
