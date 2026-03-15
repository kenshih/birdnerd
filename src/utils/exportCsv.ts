import type { BirdRecord, Session } from '../types'

const HEADERS = [
  'bandNumber', 'speciesCode', 'age', 'sex', 'howAged', 'howSexed',
  'bbpCode', 'skull', 'cp', 'bp', 'fat', 'bodyMolt', 'ffMolt', 'tfMolt',
  'ffWear', 'moltLimitsPlumage', 'wing', 'bodyMass', 'status',
  'captureTime', 'date', 'station', 'net', 'bander', 'notes',
]

function escape(value: unknown): string {
  if (value === undefined || value === null) return ''
  const s = String(value)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

export function exportSessionCSV(session: Session, records: BirdRecord[]) {
  const rows = [
    HEADERS.join(','),
    ...records.map(r => HEADERS.map(h => escape(r[h as keyof BirdRecord])).join(',')),
  ]
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `birdnerd_${session.station}_${session.date}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
