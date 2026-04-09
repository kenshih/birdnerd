import { describe, it, expect } from 'vitest'
import { validateRecord, type ValidationInput } from './validation'

function v(overrides: Partial<ValidationInput> = {}, netLabels?: Set<string>) {
  return validateRecord(overrides, netLabels)
}

// ─── Sex / BP / CP conflicts ────────────────────────────────────────

describe('Sex + Brood Patch', () => {
  it('warns when Sex=M and BP=3', () => {
    expect(v({ sex: 'M', bp: '3' }).bp).toMatch(/Sex=M/)
  })

  it('warns when Sex=M and BP=4', () => {
    expect(v({ sex: 'M', bp: '4' }).bp).toMatch(/Sex=M/)
  })

  it('no warning for Sex=M and BP=0', () => {
    expect(v({ sex: 'M', bp: '0' }).bp).toBeUndefined()
  })

  it('no warning for Sex=F and BP=3', () => {
    expect(v({ sex: 'F', bp: '3' }).bp).toBeUndefined()
  })

  it('no warning when sex is empty', () => {
    expect(v({ bp: '3' }).bp).toBeUndefined()
  })
})

describe('Sex + Cloacal Protuberance', () => {
  it('warns when Sex=F and CP=1', () => {
    expect(v({ sex: 'F', cp: '1' }).cp).toMatch(/Sex=F/)
  })

  it('warns when Sex=F and CP=3', () => {
    expect(v({ sex: 'F', cp: '3' }).cp).toMatch(/Sex=F/)
  })

  it('no warning for Sex=F and CP=0', () => {
    expect(v({ sex: 'F', cp: '0' }).cp).toBeUndefined()
  })

  it('no warning for Sex=M and CP=2', () => {
    expect(v({ sex: 'M', cp: '2' }).cp).toBeUndefined()
  })
})

// ─── SK in How Aged → require Skull ─────────────────────────────────

describe('SK in How Aged', () => {
  it('warns when howAged=SK and skull empty', () => {
    expect(v({ howAged: 'SK' }).skull).toMatch(/Skull required/)
  })

  it('warns when howAged2=SK and skull empty', () => {
    expect(v({ howAged2: 'SK' }).skull).toMatch(/Skull required/)
  })

  it('no warning when howAged=SK and skull filled', () => {
    expect(v({ howAged: 'SK', skull: '6' }).skull).toBeUndefined()
  })

  it('no warning when howAged is not SK', () => {
    expect(v({ howAged: 'PL' }).skull).toBeUndefined()
  })
})

// ─── How Aged/Sexed = OT → require note ─────────────────────────────

describe('How Aged/Sexed = OT', () => {
  it('warns on notes when howAged=OT and no notes', () => {
    expect(v({ howAged: 'OT' }).notes).toMatch(/How Aged\/Sexed/)
  })

  it('warns on notes when howSexed=OT and no notes', () => {
    expect(v({ howSexed: 'OT' }).notes).toMatch(/How Aged\/Sexed/)
  })

  it('warns on notes when howAged2=OT and no notes', () => {
    expect(v({ howAged2: 'OT' }).notes).toMatch(/How Aged\/Sexed/)
  })

  it('no warning when howAged=OT and notes present', () => {
    expect(v({ howAged: 'OT', notes: 'explained here' }).notes).toBeUndefined()
  })
})

// ─── Status 500 → require disposition + note ────────────────────────

describe('Status 500', () => {
  it('warns on disposition when empty', () => {
    expect(v({ status: '500' }).disposition).toMatch(/Disposition required/)
  })

  it('warns on notes when empty', () => {
    expect(v({ status: '500' }).notes).toMatch(/Status 500/)
  })

  it('no warning on disposition when filled', () => {
    expect(v({ status: '500', disposition: 'M' }).disposition).toBeUndefined()
  })

  it('no warning on notes when filled', () => {
    expect(v({ status: '500', notes: 'wing injury' }).notes).toBeUndefined()
  })
})

// ─── Mortality → require note ───────────────────────────────────────

describe('Mortality (Status ---)', () => {
  it('warns on notes when empty', () => {
    expect(v({ status: '---' }).notes).toMatch(/Mortality/)
  })

  it('no warning when notes filled', () => {
    expect(v({ status: '---', notes: 'found dead in net' }).notes).toBeUndefined()
  })
})

// ─── Status OT → require note ───────────────────────────────────────

describe('Status OT', () => {
  it('warns on notes when empty', () => {
    expect(v({ status: 'OT' }).notes).toMatch(/Status=Other/)
  })

  it('no warning when notes filled', () => {
    expect(v({ status: 'OT', notes: 'special case' }).notes).toBeUndefined()
  })
})

// ─── Blood Sample → status check ────────────────────────────────────

describe('Blood Sample + Status', () => {
  it('warns when blood sample and status is 300', () => {
    expect(v({ bloodSample: true, status: '300' }).status).toMatch(/Blood sample/)
  })

  it('no warning when blood sample and status is 318', () => {
    expect(v({ bloodSample: true, status: '318' }).status).toBeUndefined()
  })

  it('no warning when blood sample and status is 319', () => {
    expect(v({ bloodSample: true, status: '319' }).status).toBeUndefined()
  })

  it('no warning when blood sample and status is 334', () => {
    expect(v({ bloodSample: true, status: '334' }).status).toBeUndefined()
  })

  it('no warning when blood sample not checked', () => {
    expect(v({ bloodSample: false, status: '300' }).status).toBeUndefined()
  })

  it('warns when blood sample checked but status is missing', () => {
    expect(v({ bloodSample: true }).status).toBe('Blood sample taken — Status should be 318, 319, or 334')
  })
})

// ─── Net not in session effort ──────────────────────────────────────

describe('Net validation', () => {
  const nets = new Set(['1', '2', '3'])

  it('warns when net not in session effort', () => {
    expect(v({ net: '5' }, nets).net).toMatch(/Net 5 not in session/)
  })

  it('no warning when net is in session effort', () => {
    expect(v({ net: '2' }, nets).net).toBeUndefined()
  })

  it('no warning when net is empty', () => {
    expect(v({ net: '' }, nets).net).toBeUndefined()
  })

  it('no warning when no session net labels provided', () => {
    expect(v({ net: '5' }).net).toBeUndefined()
  })

  it('no warning when session net labels is empty set', () => {
    expect(v({ net: '5' }, new Set()).net).toBeUndefined()
  })
})

// ─── Combined / edge cases ──────────────────────────────────────────

describe('combined warnings', () => {
  it('multiple warnings on notes (OT + Status 500)', () => {
    const w = v({ howAged: 'OT', status: '500' })
    expect(w.notes).toMatch(/How Aged/)
    expect(w.notes).toMatch(/Status 500/)
  })

  it('no warnings on clean record', () => {
    const w = v({
      sex: 'M', bp: '0', cp: '2', howAged: 'SK', skull: '6',
      status: '300', disposition: 'M', notes: 'Found deceased in net',
    })
    expect(Object.keys(w)).toHaveLength(0)
  })

  it('empty input produces no warnings', () => {
    expect(Object.keys(v({})).length).toBe(0)
  })
})

// ─── Band status vs capture code ──────────────────────────────────────

describe('Band status vs capture code', () => {
  it('warns when capture code is New but band is deployed', () => {
    expect(v({ bandStatus: 'deployed', captureCode: '1' }).bbpCode).toMatch(/already deployed/)
  })

  it('warns when capture code is N but band is deployed', () => {
    expect(v({ bandStatus: 'deployed', captureCode: 'N' }).bbpCode).toMatch(/already deployed/)
  })

  it('warns when capture code is Recapture but band is available', () => {
    expect(v({ bandStatus: 'available', captureCode: 'R' }).bbpCode).toMatch(/available/)
  })

  it('no warning for New + available', () => {
    expect(v({ bandStatus: 'available', captureCode: '1' }).bbpCode).toBeUndefined()
  })

  it('no warning for Recapture + deployed', () => {
    expect(v({ bandStatus: 'deployed', captureCode: 'R' }).bbpCode).toBeUndefined()
  })

  it('no warning when band status is not set', () => {
    expect(v({ captureCode: '1' }).bbpCode).toBeUndefined()
  })

  it('no warning when capture code is not set', () => {
    expect(v({ bandStatus: 'deployed' }).bbpCode).toBeUndefined()
  })

  it('no warning when editing own band (New + deployed but isOwnBand)', () => {
    expect(v({ bandStatus: 'deployed', captureCode: '1', isOwnBand: true }).bbpCode).toBeUndefined()
  })
})

// ─── Band size validation ────────────────────────────────────────────

describe('Band size mismatch', () => {
  it('warns when band size is not in species valid list', () => {
    // SOSP valid sizes: 1B, 1, 1C — size 3 is wrong
    expect(v({ speciesCode: 'SOSP', bandSize: '3' }).bandSize).toMatch(/unusual/)
  })

  it('no warning when band size is valid for species', () => {
    expect(v({ speciesCode: 'SOSP', bandSize: '1B' }).bandSize).toBeUndefined()
  })

  it('no warning when species not in lookup', () => {
    expect(v({ speciesCode: 'XXXX', bandSize: '3' }).bandSize).toBeUndefined()
  })

  it('no warning when bandSize is missing', () => {
    expect(v({ speciesCode: 'SOSP' }).bandSize).toBeUndefined()
  })

  it('no warning when speciesCode is missing', () => {
    expect(v({ bandSize: '3' }).bandSize).toBeUndefined()
  })
})

// ─── Morphometric range validation ──────────────────────────────────

describe('Wing range', () => {
  it('warns when wing is below female range (Sex=F)', () => {
    // SOSP female wing: 52–83
    expect(v({ speciesCode: 'SOSP', sex: 'F', wing: 40 }).wing).toMatch(/Wing/)
  })

  it('warns when wing is above male range (Sex=M)', () => {
    // SOSP male wing: 54–87
    expect(v({ speciesCode: 'SOSP', sex: 'M', wing: 100 }).wing).toMatch(/Wing/)
  })

  it('no warning when wing is in range', () => {
    expect(v({ speciesCode: 'SOSP', sex: 'F', wing: 65 }).wing).toBeUndefined()
  })

  it('warns when sex unknown and wing outside both ranges', () => {
    // SOSP F: 52–83, M: 54–87 — value 20 is outside both
    expect(v({ speciesCode: 'SOSP', sex: 'U', wing: 20 }).wing).toMatch(/Wing/)
  })

  it('no warning when sex unknown and wing inside one range', () => {
    // SOSP F: 52–83, M: 54–87 — value 83 is inside female range
    expect(v({ speciesCode: 'SOSP', sex: 'U', wing: 83 }).wing).toBeUndefined()
  })

  it('no warning when species not in lookup', () => {
    expect(v({ speciesCode: 'XXXX', sex: 'F', wing: 1 }).wing).toBeUndefined()
  })
})

describe('Body mass range', () => {
  it('warns when body mass is outside range', () => {
    // WIWA F weight: 6–10
    expect(v({ speciesCode: 'WIWA', sex: 'F', bodyMass: 50 }).bodyMass).toMatch(/Body mass/)
  })

  it('no warning when body mass is in range', () => {
    expect(v({ speciesCode: 'WIWA', sex: 'F', bodyMass: 8 }).bodyMass).toBeUndefined()
  })
})

describe('Tail range', () => {
  it('warns when tail is outside range', () => {
    // SOSP F tail: 51–83
    expect(v({ speciesCode: 'SOSP', sex: 'F', tail: 20 }).tail).toMatch(/Tail/)
  })

  it('no warning when tail is in range', () => {
    expect(v({ speciesCode: 'SOSP', sex: 'F', tail: 60 }).tail).toBeUndefined()
  })
})

// ─── Disposition requires notes ──────────────────────────────────────

describe('Disposition requires notes', () => {
  it('warns when disposition is set and notes is empty', () => {
    expect(v({ disposition: 'M', notes: '' }).notes).toMatch(/Disposition/)
  })

  it('warns when disposition is set and notes is whitespace', () => {
    expect(v({ disposition: 'M', notes: '   ' }).notes).toMatch(/Disposition/)
  })

  it('no warning when disposition is set and notes has content', () => {
    expect(v({ disposition: 'M', notes: 'Found dead in net' }).notes).toBeUndefined()
  })

  it('no warning when disposition is not set', () => {
    expect(v({ disposition: '', notes: '' }).notes).toBeUndefined()
  })
})
