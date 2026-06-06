import type { Band } from '@birdnerd/shared'
import { BAND_SIZE_CODES, BAND_TYPE_CODES } from '../data/codes'

// Pure helpers for the Band Inventory views — no DB or React deps, so they're
// unit-testable in isolation.

const SIZE_ORDER = BAND_SIZE_CODES.map(c => c.code)
const TYPE_ORDER = BAND_TYPE_CODES.map(c => c.code)

function rank(order: string[], value: string): number {
  const i = order.indexOf(value)
  return i === -1 ? order.length : i
}

export interface SizeTypeCount {
  size: string
  type: string
  available: number
  deployed: number
  total: number
}

export interface BandStats {
  total: number
  available: number
  deployed: number
  other: number
  /** Per (size, type) breakdown, sorted by BBL size order then band-type order. */
  bySizeType: SizeTypeCount[]
}

export function computeBandStats(bands: Band[]): BandStats {
  let available = 0
  let deployed = 0
  let other = 0
  const map = new Map<string, SizeTypeCount>()

  for (const b of bands) {
    if (b.status === 'available') available++
    else if (b.status === 'deployed') deployed++
    else other++

    const key = `${b.bandSize}|${b.bandType}`
    const entry = map.get(key) ?? { size: b.bandSize, type: b.bandType, available: 0, deployed: 0, total: 0 }
    entry.total++
    if (b.status === 'available') entry.available++
    else if (b.status === 'deployed') entry.deployed++
    map.set(key, entry)
  }

  const bySizeType = Array.from(map.values()).sort(
    (a, b) =>
      rank(SIZE_ORDER, a.size) - rank(SIZE_ORDER, b.size) ||
      rank(TYPE_ORDER, a.type) - rank(TYPE_ORDER, b.type) ||
      a.type.localeCompare(b.type),
  )

  return { total: bands.length, available, deployed, other, bySizeType }
}

export interface BandString {
  prefix: string
  hundred: number
  /** Display label: a single number, or "start to end" for the run present in this 100-block. */
  label: string
  rangeStart: string
  rangeEnd: string
  total: number
  available: number
  deployed: number
}

/**
 * Group bands into "strings" of 100 (prefix + suffix hundreds-block), reporting
 * the actual range present and counts. Bands typically arrive in strings of 100,
 * so this shows which strings are on hand and how complete each is.
 */
export function computeBandStrings(bands: Band[]): BandString[] {
  interface Acc {
    prefix: string
    hundred: number
    minSuffix: number
    maxSuffix: number
    startNum: string
    endNum: string
    total: number
    available: number
    deployed: number
  }
  const map = new Map<string, Acc>()

  for (const b of bands) {
    const m = /^(\d+)-(\d+)$/.exec(b.bandNumber)
    if (!m) continue
    const prefix = m[1]!
    const suffix = Number(m[2]!)
    const hundred = Math.floor(suffix / 100)
    const key = `${prefix}|${hundred}`
    const acc = map.get(key)
    if (!acc) {
      map.set(key, {
        prefix,
        hundred,
        minSuffix: suffix,
        maxSuffix: suffix,
        startNum: b.bandNumber,
        endNum: b.bandNumber,
        total: 1,
        available: b.status === 'available' ? 1 : 0,
        deployed: b.status === 'deployed' ? 1 : 0,
      })
    } else {
      acc.total++
      if (b.status === 'available') acc.available++
      else if (b.status === 'deployed') acc.deployed++
      if (suffix < acc.minSuffix) { acc.minSuffix = suffix; acc.startNum = b.bandNumber }
      if (suffix > acc.maxSuffix) { acc.maxSuffix = suffix; acc.endNum = b.bandNumber }
    }
  }

  return Array.from(map.values())
    .sort((a, b) => a.prefix.localeCompare(b.prefix) || a.hundred - b.hundred)
    .map(e => ({
      prefix: e.prefix,
      hundred: e.hundred,
      label: e.startNum === e.endNum ? e.startNum : `${e.startNum} to ${e.endNum}`,
      rangeStart: e.startNum,
      rangeEnd: e.endNum,
      total: e.total,
      available: e.available,
      deployed: e.deployed,
    }))
}

const CSV_HEADERS = ['bandNumber', 'bandSize', 'bandType', 'status', 'currentSpecies', 'deploymentDate'] as const

function csvEscape(value: unknown): string {
  if (value === undefined || value === null) return ''
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Band inventory as CSV text (one row per band) for sharing/printing. */
export function bandInventoryToCsv(bands: Band[]): string {
  const rows = [CSV_HEADERS.join(',')]
  for (const b of bands) {
    rows.push(CSV_HEADERS.map(h => csvEscape(b[h])).join(','))
  }
  return rows.join('\n')
}
