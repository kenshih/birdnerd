import type { BirdRecord, Session, Band, BandType, Location, SessionBanderLog } from '@birdnerd/shared'
import { getDB } from '../db'
import type { ImportPlan, ImportWarning } from './masterSheetImport'

/**
 * Apply a master-sheet ImportPlan to IndexedDB (Phase 25).
 *
 * No-clobber: **skip-if-exists, never overwrite.** Natural keys —
 *   bands: digits-only band number · sessions: stationCode|date · records: bandDigits|date.
 * Unknown station codes get a stub Location auto-created. Pass `dryRun` to
 * compute the same summary for the preview without writing anything.
 */

export interface ImportSummary {
  sessionsCreated: number
  sessionsSkipped: number
  bandsCreated: number
  bandsSkipped: number
  recordsCreated: number
  recordsSkipped: number
  locationsCreated: string[]   // station codes
  banderLogsCreated: number
  unknownBanders: string[]     // initials seen but not linked (no matching Bander)
  warnings: ImportWarning[]
  rejectCount: number
}

let seq = 0
function newId(prefix = ''): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${seq++}`
}

const digitsOf = (bn: string | undefined) => (bn ?? '').replace(/\D/g, '')

export async function applyImportPlan(
  plan: ImportPlan,
  opts: { dryRun?: boolean } = {},
): Promise<ImportSummary> {
  const db = await getDB()
  const now = new Date().toISOString()

  const [locations, existingBands, existingSessions, existingRecords, people, banders] = await Promise.all([
    db.getAll('locations'),
    db.getAll('bands'),
    db.getAll('sessions'),
    db.getAll('records'),
    db.getAll('people'),
    db.getAll('banders'),
  ])

  // Existing-state lookups for dedup.
  const locationIdByCode = new Map(locations.map(l => [l.banderLocationId, l.id]))
  const codeByLocationId = new Map(locations.map(l => [l.id, l.banderLocationId]))
  const existingBandDigits = new Set(existingBands.map(b => digitsOf(b.bandNumber)))
  const existingSessionKeys = new Set(
    existingSessions.map(s => `${codeByLocationId.get(s.locationId) ?? ''}|${s.date}`),
  )
  const existingRecordKeys = new Set(
    existingRecords.map(r => `${digitsOf(r.bandNumber)}|${r.date ?? ''}`),
  )

  // initials → banderId (via person)
  const personIdByInitials = new Map(people.map(p => [p.initials, p.id]))
  const banderIdByPersonId = new Map(banders.map(b => [b.personId, b.id]))
  const banderIdByInitials = (initials: string): string | undefined => {
    const pid = personIdByInitials.get(initials)
    return pid ? banderIdByPersonId.get(pid) : undefined
  }

  const summary: ImportSummary = {
    sessionsCreated: 0, sessionsSkipped: 0,
    bandsCreated: 0, bandsSkipped: 0,
    recordsCreated: 0, recordsSkipped: 0,
    locationsCreated: [], banderLogsCreated: 0,
    unknownBanders: [],
    warnings: [...plan.warnings],
    rejectCount: plan.rejects.length,
  }

  // Entities to write (only when not dryRun).
  const newLocations: Location[] = []
  const newSessions: Session[] = []
  const newBands: Band[] = []
  const newRecords: BirdRecord[] = []
  const newBanderLogs: SessionBanderLog[] = []

  // ── Locations (resolve / stub-create for each station code in the plan) ──
  const stationCodes = new Set(plan.sessions.map(s => s.stationCode))
  for (const code of stationCodes) {
    if (locationIdByCode.has(code)) continue
    const id = newId('loc-')
    locationIdByCode.set(code, id)
    summary.locationsCreated.push(code)
    newLocations.push({
      id, banderLocationId: code, bblLocationId: null, name: code,
      latitude: 0, longitude: 0, country: '', stateProvince: '', remarks: '',
      createdAt: now, updatedAt: now,
    })
  }

  // ── Sessions ──
  const sessionIdByKey = new Map<string, string>()
  // Pre-map existing sessions by key so records can attach to them too.
  for (const s of existingSessions) {
    sessionIdByKey.set(`${codeByLocationId.get(s.locationId) ?? ''}|${s.date}`, s.id)
  }
  const unknownBanderSet = new Set<string>()
  for (const draft of plan.sessions) {
    if (existingSessionKeys.has(draft.key)) {
      summary.sessionsSkipped++
      continue
    }
    const id = newId('ses-')
    sessionIdByKey.set(draft.key, id)
    summary.sessionsCreated++

    const masterBanderId = draft.banders.includes('HD') ? banderIdByInitials('HD') : undefined
    newSessions.push({
      id, locationId: locationIdByCode.get(draft.stationCode) ?? '',
      date: draft.date, masterBanderId, createdAt: now, updatedAt: now,
    })

    // Session participant logs — link known banders, warn on unknown.
    for (const initials of draft.banders) {
      const banderId = banderIdByInitials(initials)
      if (!banderId) { unknownBanderSet.add(initials); continue }
      summary.banderLogsCreated++
      newBanderLogs.push({ id: newId('sbl-'), sessionId: id, banderId, createdAt: now, updatedAt: now })
    }
  }
  summary.unknownBanders = [...unknownBanderSet].sort()
  for (const initials of summary.unknownBanders) {
    summary.warnings.push({ row: 0, field: 'Bander', message: `Initials "${initials}" not found in People — recorded on bird records but not linked as a session participant` })
  }

  // ── Bands ──
  const bandIdByDigits = new Map<string, string>()
  for (const b of existingBands) bandIdByDigits.set(digitsOf(b.bandNumber), b.id)
  for (const draft of plan.bands) {
    if (existingBandDigits.has(draft.digits)) {
      summary.bandsSkipped++
      continue
    }
    const id = newId('bnd-')
    bandIdByDigits.set(draft.digits, id)
    summary.bandsCreated++
    newBands.push({
      id, bandNumber: draft.bandNumber, status: draft.status,
      bandSize: draft.bandSize, bandType: '' as BandType, // not in sheet (warned in plan)
      currentSpecies: draft.currentSpecies, deploymentDate: draft.deploymentDate,
      createdAt: now, updatedAt: now,
    })
  }

  // ── Records ──
  for (const draft of plan.records) {
    const recordKey = `${draft.bandDigits ?? ''}|${draft.fields.date ?? ''}`
    if (existingRecordKeys.has(recordKey)) {
      summary.recordsSkipped++
      continue
    }
    existingRecordKeys.add(recordKey) // guard against intra-import dupes
    summary.recordsCreated++
    newRecords.push({
      ...draft.fields,
      id: newId('rec-'),
      sessionId: sessionIdByKey.get(draft.sessionKey) ?? '',
      bandId: draft.bandDigits ? bandIdByDigits.get(draft.bandDigits) : undefined,
      createdAt: now, updatedAt: now,
    })
  }

  if (opts.dryRun) return summary

  // ── Write everything in one transaction ──
  const tx = db.transaction(
    ['locations', 'sessions', 'sessionBanderLogs', 'bands', 'records'],
    'readwrite',
  )
  for (const l of newLocations) await tx.objectStore('locations').put(l)
  for (const s of newSessions) await tx.objectStore('sessions').put(s)
  for (const sbl of newBanderLogs) await tx.objectStore('sessionBanderLogs').put(sbl)
  for (const b of newBands) await tx.objectStore('bands').put(b)
  for (const r of newRecords) await tx.objectStore('records').put(r)
  await tx.done

  return summary
}
