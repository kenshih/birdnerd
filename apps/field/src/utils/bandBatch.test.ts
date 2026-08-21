import { describe, expect, it } from 'vitest'
import { expandBandRange } from './bandBatch'

describe('expandBandRange', () => {
  it('preserves suffix width and expands an inclusive batch', () => {
    expect(expandBandRange({ prefix: '1154', start_suffix: '081501', end_suffix: '081503' })).toEqual({
      band_numbers: ['1154-081501', '1154-081502', '1154-081503'],
    })
  })

  it('rejects malformed, reversed, and oversized ranges', () => {
    expect(expandBandRange({ prefix: '154', start_suffix: '81501', end_suffix: '81502' }).error).toMatch('4 digits')
    expect(expandBandRange({ prefix: '1154', start_suffix: '81502', end_suffix: '81501' }).error).toMatch('greater than')
    expect(expandBandRange({ prefix: '1154', start_suffix: '00000', end_suffix: '02000' }).error).toMatch('Maximum 2000')
  })
})
