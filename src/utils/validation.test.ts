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

  it('no warning when blood sample checked but no status yet', () => {
    expect(v({ bloodSample: true }).status).toBeUndefined()
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
      status: '300', disposition: 'M', notes: '',
    })
    expect(Object.keys(w)).toHaveLength(0)
  })

  it('empty input produces no warnings', () => {
    expect(Object.keys(v({})).length).toBe(0)
  })
})
