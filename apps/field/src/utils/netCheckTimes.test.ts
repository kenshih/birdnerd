import { describe, it, expect } from 'vitest'
import { netCheckTimes } from './netCheckTimes'

describe('netCheckTimes', () => {
  it('returns inclusive 30-min slots across the open→close window', () => {
    expect(netCheckTimes('06:00', '08:00')).toEqual([
      '06:00', '06:30', '07:00', '07:30', '08:00',
    ])
  })

  it('honors a custom step', () => {
    expect(netCheckTimes('06:00', '07:00', 20)).toEqual(['06:00', '06:20', '06:40', '07:00'])
  })

  it('defaults the start to 05:00 when open is missing', () => {
    expect(netCheckTimes(undefined, '06:00')[0]).toBe('05:00')
  })

  it('uses a 7-hour default window when close is missing', () => {
    const slots = netCheckTimes('06:00')
    expect(slots[0]).toBe('06:00')
    expect(slots[slots.length - 1]).toBe('13:00')
  })

  it('falls back to a default window when close is not after open', () => {
    const slots = netCheckTimes('06:00', '06:00')
    expect(slots[0]).toBe('06:00')
    expect(slots[slots.length - 1]).toBe('13:00')
  })

  it('ignores malformed times and uses defaults', () => {
    expect(netCheckTimes('nonsense', '99:99')[0]).toBe('05:00')
  })

  it('caps the number of slots', () => {
    // a huge window must not produce an unbounded list
    expect(netCheckTimes('00:00', '23:30').length).toBeLessThanOrEqual(48)
  })
})
