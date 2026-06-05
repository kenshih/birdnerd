import { describe, it, expect } from 'vitest'
import type { Band } from '@birdnerd/shared'
import { computeBandStats, computeBandStrings, bandInventoryToCsv } from './bandInventory'

function band(partial: Partial<Band> & { bandNumber: string }): Band {
  return {
    id: `id-${partial.bandNumber}`,
    status: 'available',
    bandSize: '1B',
    bandType: 'Standard',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('computeBandStats', () => {
  it('counts totals and breaks down by size and type', () => {
    const bands = [
      band({ bandNumber: '1154-00001', bandSize: '1B', bandType: 'Standard', status: 'available' }),
      band({ bandNumber: '1154-00002', bandSize: '1B', bandType: 'Standard', status: 'deployed' }),
      band({ bandNumber: '1154-00003', bandSize: '1B', bandType: 'Lock-on', status: 'available' }),
      band({ bandNumber: '1154-00004', bandSize: '2', bandType: 'Stainless-steel', status: 'lost' }),
    ]
    const s = computeBandStats(bands)
    expect(s.total).toBe(4)
    expect(s.available).toBe(2)
    expect(s.deployed).toBe(1)
    expect(s.other).toBe(1)

    const standard1B = s.bySizeType.find(r => r.size === '1B' && r.type === 'Standard')!
    expect(standard1B).toMatchObject({ available: 1, deployed: 1, total: 2 })
    expect(s.bySizeType.find(r => r.type === 'Lock-on')).toMatchObject({ available: 1, total: 1 })
  })

  it('sorts by BBL size order then band-type order', () => {
    const bands = [
      band({ bandNumber: '1-2', bandSize: '2', bandType: 'Standard' }),
      band({ bandNumber: '1-1', bandSize: '1B', bandType: 'Lock-on' }),
      band({ bandNumber: '1-3', bandSize: '1B', bandType: 'Standard' }),
    ]
    const order = computeBandStats(bands).bySizeType.map(r => `${r.size}/${r.type}`)
    // 1B before 2; within 1B, Standard (code order) before Lock-on
    expect(order).toEqual(['1B/Standard', '1B/Lock-on', '2/Standard'])
  })
})

describe('computeBandStrings', () => {
  it('groups bands into 100-blocks with the present range and counts', () => {
    const bands = [
      band({ bandNumber: '1154-81501', status: 'deployed' }),
      band({ bandNumber: '1154-81550', status: 'available' }),
      band({ bandNumber: '1154-81600', status: 'available' }),
    ]
    const strings = computeBandStrings(bands)
    expect(strings).toHaveLength(2) // 815xx block and 816xx block
    expect(strings[0]).toMatchObject({
      prefix: '1154', hundred: 815, label: '1154-81501 to 1154-81550', total: 2, available: 1, deployed: 1,
    })
    expect(strings[1]).toMatchObject({ hundred: 816, label: '1154-81600', total: 1 })
  })

  it('skips band numbers that do not parse', () => {
    expect(computeBandStrings([band({ bandNumber: 'WEIRD' })])).toEqual([])
  })
})

describe('bandInventoryToCsv', () => {
  it('emits a header and one row per band, escaping as needed', () => {
    const csv = bandInventoryToCsv([
      band({ bandNumber: '1154-00001', bandSize: '1B', bandType: 'Standard', status: 'available' }),
      band({ bandNumber: '1154-00002', status: 'deployed', currentSpecies: 'SOSP', deploymentDate: '2026-05-01' }),
    ])
    const lines = csv.split('\n')
    expect(lines[0]).toBe('bandNumber,bandSize,bandType,status,currentSpecies,deploymentDate')
    expect(lines[1]).toBe('1154-00001,1B,Standard,available,,')
    expect(lines[2]).toBe('1154-00002,1B,Standard,deployed,SOSP,2026-05-01')
  })
})
