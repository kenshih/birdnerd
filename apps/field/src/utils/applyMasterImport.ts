import type { BirdRecord, Session, Band, Location, SessionBanderLog, Person, Bander } from '@birdnerd/shared'
import { getDB } from '../db'
import type { ImportPlan, ImportWarning } from './masterSheetImport'

/**
 * Bander-initials reconciliation: the master sheet abbreviates some banders
 * differently than our People records. Map sheet initials → canonical People
 * initials so they link to the existing person instead of creating a duplicate.
 */
const BANDER_INITIALS_ALIASES: Record<string, string> = {
  JV: 'JVD', // Joanna van Dyk — sheet uses "JV", People record is "JVD"
}

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
  peopleCreated: string[]      // initials auto-created as People (placeholder names)
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

  // initials → banderId (via person), seeded from existing data and grown as we
  // auto-create people for unknown helpers.
  const personIdByInitials = new Map(people.map(p => [p.initials, p.id]))
  const banderIdByPersonId = new Map(banders.map(b => [b.personId, b.id]))

  const summary: ImportSummary = {
    sessionsCreated: 0, sessionsSkipped: 0,
    bandsCreated: 0, bandsSkipped: 0,
    recordsCreated: 0, recordsSkipped: 0,
    locationsCreated: [], banderLogsCreated: 0,
    peopleCreated: [],
    warnings: [...plan.warnings],
    rejectCount: plan.rejects.length,
  }

  // Entities to write (only when not dryRun).
  const newLocations: Location[] = []
  const newSessions: Session[] = []
  const newBands: Band[] = []
  const newRecords: BirdRecord[] = []
  const newBanderLogs: SessionBanderLog[] = []
  const newPeople: Person[] = []
  const newBanders: Bander[] = []

  // Resolve sheet initials to a Bander id, applying aliases and auto-creating a
  // stub Person + Bander (placeholder name = initials) for unknown helpers.
  const createdPeopleInitials = new Set<string>()
  function resolveBanderId(rawInitials: string): string | undefined {
    const initials = BANDER_INITIALS_ALIASES[rawInitials] ?? rawInitials
    if (!initials) return undefined
    const existingPid = personIdByInitials.get(initials)
    if (existingPid) {
      const bid = banderIdByPersonId.get(existingPid)
      if (bid) return bid
      // Person exists without a Bander record — link one.
      const banderId = newId('bdr-')
      banderIdByPersonId.set(existingPid, banderId)
      newBanders.push({ id: banderId, personId: existingPid, role: 'Bander', createdAt: now, updatedAt: now })
      return banderId
    }
    const personId = newId('per-')
    const banderId = newId('bdr-')
    personIdByInitials.set(initials, personId)
    banderIdByPersonId.set(personId, banderId)
    createdPeopleInitials.add(initials)
    newPeople.push({ id: personId, name: initials, initials, active: true, createdAt: now, updatedAt: now })
    newBanders.push({ id: banderId, personId, role: 'Bander', createdAt: now, updatedAt: now })
    return banderId
  }

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
  for (const draft of plan.sessions) {
    if (existingSessionKeys.has(draft.key)) {
      summary.sessionsSkipped++
      continue
    }
    const id = newId('ses-')
    sessionIdByKey.set(draft.key, id)
    summary.sessionsCreated++

    const masterBanderId = draft.banders.includes('HD') ? resolveBanderId('HD') : undefined
    newSessions.push({
      id, locationId: locationIdByCode.get(draft.stationCode) ?? '',
      date: draft.date, masterBanderId, createdAt: now, updatedAt: now,
    })

    // Session participant logs — link each bander (auto-creating unknown helpers).
    for (const initials of draft.banders) {
      const banderId = resolveBanderId(initials)
      if (!banderId) continue
      summary.banderLogsCreated++
      newBanderLogs.push({ id: newId('sbl-'), sessionId: id, banderId, createdAt: now, updatedAt: now })
    }
  }
  summary.peopleCreated = [...createdPeopleInitials].sort()

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
      bandSize: draft.bandSize, bandType: 'Standard', // master sheet has no band-type column; default per import policy
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
    ['locations', 'people', 'banders', 'sessions', 'sessionBanderLogs', 'bands', 'records'],
    'readwrite',
  )
  for (const l of newLocations) await tx.objectStore('locations').put(l)
  for (const p of newPeople) await tx.objectStore('people').put(p)
  for (const bd of newBanders) await tx.objectStore('banders').put(bd)
  for (const s of newSessions) await tx.objectStore('sessions').put(s)
  for (const sbl of newBanderLogs) await tx.objectStore('sessionBanderLogs').put(sbl)
  for (const b of newBands) await tx.objectStore('bands').put(b)
  for (const r of newRecords) await tx.objectStore('records').put(r)
  await tx.done

  return summary
}
