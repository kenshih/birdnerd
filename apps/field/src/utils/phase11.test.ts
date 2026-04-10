import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetDB, saveLocation, saveNet, getActiveNetsByLocation, generateSessionNetLogs, getSessionNetLogs } from '../db'
import type { Location, Net } from '@birdnerd/shared'
import { calcNetHours } from '../pages/SessionView'

// Mock fetch so getDB()'s seed check doesn't try to hit the network
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))

const now = new Date().toISOString()

const testLocation: Location = {
  id: 'loc-test', banderLocationId: 'TEST', bblLocationId: null,
  name: 'Test Station', latitude: 37.0, longitude: -122.0,
  country: 'US', stateProvince: 'CA', remarks: '',
  createdAt: now, updatedAt: now,
}

function makeNet(id: string, label: string, active: boolean): Net {
  return {
    id, locationId: 'loc-test', label, active,
    createdAt: now, updatedAt: now,
  }
}

// ─── Net-hours calculation ──────────────────────────────────────────

describe('calcNetHours', () => {
  it('calculates hours between two times', () => {
    expect(calcNetHours('06:00', '12:00')).toBe(6)
    expect(calcNetHours('06:30', '12:00')).toBe(5.5)
    expect(calcNetHours('06:00', '06:30')).toBe(0.5)
  })

  it('returns null for missing times', () => {
    expect(calcNetHours(undefined, '12:00')).toBeNull()
    expect(calcNetHours('06:00', undefined)).toBeNull()
    expect(calcNetHours(undefined, undefined)).toBeNull()
  })

  it('returns null for same open/close', () => {
    expect(calcNetHours('06:00', '06:00')).toBeNull()
  })

  it('returns null for close before open', () => {
    expect(calcNetHours('12:00', '06:00')).toBeNull()
  })

  it('handles minute precision', () => {
    // 6:15 to 11:45 = 5.5 hours
    expect(calcNetHours('06:15', '11:45')).toBe(5.5)
  })
})

// ─── Net soft-delete & SessionNetLog generation (uses fake-indexeddb) ─

describe('net soft-delete filtering', () => {
  beforeEach(async () => {
    resetDB()
    indexedDB.deleteDatabase('birdnerd')
    await saveLocation(testLocation)
  })

  it('getActiveNetsByLocation excludes inactive nets', async () => {
    await saveNet(makeNet('net-a', '1', true))
    await saveNet(makeNet('net-b', '2', false))
    await saveNet(makeNet('net-c', '3', true))

    const active = await getActiveNetsByLocation('loc-test')
    expect(active).toHaveLength(2)
    expect(active.map(n => n.label).sort()).toEqual(['1', '3'])
  })

  it('getActiveNetsByLocation returns all when all active', async () => {
    await saveNet(makeNet('net-a', '1', true))
    await saveNet(makeNet('net-b', '2', true))

    const active = await getActiveNetsByLocation('loc-test')
    expect(active).toHaveLength(2)
  })

  it('getActiveNetsByLocation returns empty when all inactive', async () => {
    await saveNet(makeNet('net-a', '1', false))
    await saveNet(makeNet('net-b', '2', false))

    const active = await getActiveNetsByLocation('loc-test')
    expect(active).toHaveLength(0)
  })
})

describe('SessionNetLog auto-generation', () => {
  beforeEach(async () => {
    resetDB()
    indexedDB.deleteDatabase('birdnerd')
    await saveLocation(testLocation)
  })

  it('generates logs for active nets only', async () => {
    await saveNet(makeNet('net-1', '1', true))
    await saveNet(makeNet('net-2', '2', false))
    await saveNet(makeNet('net-3', '3', true))

    const logs = await generateSessionNetLogs('sess-test', 'loc-test', '06:00', '12:00')
    expect(logs).toHaveLength(2)
    expect(logs.map(l => l.netId).sort()).toEqual(['net-1', 'net-3'])
  })

  it('pre-fills session open/close times', async () => {
    await saveNet(makeNet('net-1', '1', true))

    const logs = await generateSessionNetLogs('sess-test', 'loc-test', '06:30', '11:45')
    expect(logs).toHaveLength(1)
    expect(logs[0].openTime).toBe('06:30')
    expect(logs[0].closeTime).toBe('11:45')
  })

  it('persists logs to database', async () => {
    await saveNet(makeNet('net-1', '1', true))
    await saveNet(makeNet('net-2', '2', true))

    await generateSessionNetLogs('sess-test', 'loc-test', '06:00', '12:00')

    const stored = await getSessionNetLogs('sess-test')
    expect(stored).toHaveLength(2)
  })

  it('handles no active nets', async () => {
    await saveNet(makeNet('net-1', '1', false))

    const logs = await generateSessionNetLogs('sess-test', 'loc-test', '06:00', '12:00')
    expect(logs).toHaveLength(0)
  })

  it('handles undefined times', async () => {
    await saveNet(makeNet('net-1', '1', true))

    const logs = await generateSessionNetLogs('sess-test', 'loc-test', undefined, undefined)
    expect(logs).toHaveLength(1)
    expect(logs[0].openTime).toBeUndefined()
    expect(logs[0].closeTime).toBeUndefined()
  })
})
