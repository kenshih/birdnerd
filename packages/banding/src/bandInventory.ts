import { compareEventOrder, type DomainEvent, type UuidV7 } from '@birdnerd/events'

export type BandInventoryStatus = 'inactive' | 'available' | 'deployed' | 'destroyed' | 'lost' | 'replaced'

export type BandInventoryEncounter = {
  record_id: UuidV7
  session_id?: UuidV7
  session_date?: string
  species_code?: string
  capture_code?: string
  relationship: 'selected' | 'replaced'
  event_id: UuidV7
}

export type BandInventoryItem = {
  band_id: UuidV7
  band_number: string
  band_size?: string
  band_type?: string
  active: boolean
  status: BandInventoryStatus
  status_event_id?: UuidV7
  current_species?: string
  deployment_date?: string
  last_seen_date?: string
  encounters: readonly BandInventoryEncounter[]
}

export type BandInventoryProjection = ReadonlyMap<UuidV7, BandInventoryItem>

type ProjectedEntity = {
  id: UuidV7
  kind: string
  fields: Record<string, unknown>
  active: boolean
  field_event_ids: Record<string, string>
}

type StatusFact = {
  status: Exclude<BandInventoryStatus, 'inactive' | 'available'>
  event: DomainEvent
}

const NEW_DEPLOYMENT_CODES = new Set(['1', 'N'])
const DEPLOYED_ENCOUNTER_CODES = new Set(['1', 'N', 'R', 'C', 'A', '4', '5', '6', '8'])

/**
 * Derive current inventory from active Banding Record facts. Band status is not
 * durable Band state: never persist it or reintroduce a mutable status field.
 */
export function deriveBandInventory(
  entities: ReadonlyMap<UuidV7, ProjectedEntity>,
  events: readonly DomainEvent[],
): BandInventoryProjection {
  const eventById = new Map(events.map(event => [event.event_id, event]))
  const recordCreatedEvent = new Map<UuidV7, DomainEvent>()
  const recordLifecycleEvent = new Map<UuidV7, DomainEvent>()
  const bandsByNumber = new Map<string, UuidV7[]>()

  for (const event of events) {
    const recordId = recordIdFrom(event)
    if (!recordId) continue
    if (event.event_type === 'banding-record.created' && isLater(event, recordCreatedEvent.get(recordId))) recordCreatedEvent.set(recordId, event)
    if ((event.event_type === 'banding-record.deactivated' || event.event_type === 'banding-record.reactivated') && isLater(event, recordLifecycleEvent.get(recordId))) recordLifecycleEvent.set(recordId, event)
  }

  for (const entity of entities.values()) {
    if (entity.kind !== 'band') continue
    const number = stringValue(entity.fields.band_number)
    if (!number) continue
    const normalized = normalizeBandNumber(number)
    bandsByNumber.set(normalized, [...(bandsByNumber.get(normalized) ?? []), entity.id])
  }

  const encountersByBand = new Map<UuidV7, Array<{ encounter: BandInventoryEncounter; event: DomainEvent }>>()
  const statusFactsByBand = new Map<UuidV7, StatusFact[]>()
  const deploymentFactsByBand = new Map<UuidV7, Array<{ encounter: BandInventoryEncounter; event: DomainEvent }>>()

  for (const record of entities.values()) {
    if (record.kind !== 'banding-record' || !record.active) continue
    const selection = managedSelection(record.fields.band_selection)
    const captureCode = stringValue(record.fields.capture_code)
    const sessionId = stringValue(record.fields.session_id) as UuidV7 | undefined
    const session = sessionId ? entities.get(sessionId) : undefined
    const selectedStatusEvent = recordOrderEvent(record, ['band_selection', 'capture_code'])
    const selectedEncounterEvent = recordOrderEvent(record, ['session_id', 'band_selection', 'capture_code', 'species_code'])
    const baseEncounter = {
      record_id: record.id,
      ...(sessionId ? { session_id: sessionId } : {}),
      ...(stringValue(session?.fields.session_date) ? { session_date: stringValue(session?.fields.session_date) } : {}),
      ...(stringValue(record.fields.species_code) ? { species_code: stringValue(record.fields.species_code) } : {}),
      ...(captureCode ? { capture_code: captureCode } : {}),
    }

    if (selection && selectedStatusEvent && selectedEncounterEvent) {
      const encounter: BandInventoryEncounter = { ...baseEncounter, relationship: 'selected', event_id: selectedEncounterEvent.event_id }
      addEncounter(selection.band_id, encounter, selectedEncounterEvent)
      if (captureCode === 'D') addStatusFact(selection.band_id, 'destroyed', selectedStatusEvent)
      else if (captureCode === 'L') addStatusFact(selection.band_id, 'lost', selectedStatusEvent)
      else if (captureCode && DEPLOYED_ENCOUNTER_CODES.has(captureCode)) addStatusFact(selection.band_id, 'deployed', selectedStatusEvent)
      if (captureCode && NEW_DEPLOYMENT_CODES.has(captureCode)) {
        deploymentFactsByBand.set(selection.band_id, [...(deploymentFactsByBand.get(selection.band_id) ?? []), { encounter, event: selectedStatusEvent }])
      }
    }

    // The portable Record contract defines this as the old number removed
    // from the bird. Matching that snapshot keeps replacement state derived
    // even when the same Record selects the newly applied managed Band.
    const replacedNumber = stringValue(record.fields.replaced_band_number)
    const replacementStatusEvent = recordOrderEvent(record, ['replaced_band_number'])
    const replacementEncounterEvent = recordOrderEvent(record, ['session_id', 'replaced_band_number', 'capture_code', 'species_code'])
    if (replacedNumber && replacementStatusEvent && replacementEncounterEvent) {
      for (const bandId of bandsByNumber.get(normalizeBandNumber(replacedNumber)) ?? []) {
        const encounter: BandInventoryEncounter = { ...baseEncounter, relationship: 'replaced', event_id: replacementEncounterEvent.event_id }
        addEncounter(bandId, encounter, replacementEncounterEvent)
        addStatusFact(bandId, 'replaced', replacementStatusEvent)
      }
    }
  }

  const inventory = new Map<UuidV7, BandInventoryItem>()
  for (const band of entities.values()) {
    if (band.kind !== 'band') continue
    const encounters = (encountersByBand.get(band.id) ?? [])
      .sort((left, right) => compareEventOrder(right.event, left.event))
      .map(item => item.encounter)
    const statusFact = latest(statusFactsByBand.get(band.id) ?? [])
    const deploymentFact = latest(deploymentFactsByBand.get(band.id) ?? [])
    const speciesEncounter = encounters.find(encounter => encounter.species_code)
    const seenEncounter = encounters.find(encounter => encounter.session_date)
    inventory.set(band.id, {
      band_id: band.id,
      band_number: stringValue(band.fields.band_number) ?? '',
      ...(stringValue(band.fields.band_size) ? { band_size: stringValue(band.fields.band_size) } : {}),
      ...(stringValue(band.fields.band_type) ? { band_type: stringValue(band.fields.band_type) } : {}),
      active: band.active,
      status: band.active ? statusFact?.status ?? 'available' : 'inactive',
      ...(band.active && statusFact ? { status_event_id: statusFact.event.event_id } : {}),
      ...(speciesEncounter?.species_code ? { current_species: speciesEncounter.species_code } : {}),
      ...(deploymentFact?.encounter.session_date ? { deployment_date: deploymentFact.encounter.session_date } : {}),
      ...(seenEncounter?.session_date ? { last_seen_date: seenEncounter.session_date } : {}),
      encounters,
    })
  }
  return inventory

  function addEncounter(bandId: UuidV7, encounter: BandInventoryEncounter, event: DomainEvent) {
    const existing = encountersByBand.get(bandId) ?? []
    if (!existing.some(item => item.encounter.record_id === encounter.record_id && item.encounter.relationship === encounter.relationship)) {
      encountersByBand.set(bandId, [...existing, { encounter, event }])
    }
  }

  function addStatusFact(bandId: UuidV7, status: StatusFact['status'], event: DomainEvent) {
    statusFactsByBand.set(bandId, [...(statusFactsByBand.get(bandId) ?? []), { status, event }])
  }

  function latest<T extends { event: DomainEvent }>(facts: readonly T[]): T | undefined {
    return facts.reduce<T | undefined>((winner, fact) => !winner || compareEventOrder(fact.event, winner.event) > 0 ? fact : winner, undefined)
  }

  function recordOrderEvent(record: ProjectedEntity, fields: readonly string[]): DomainEvent | undefined {
    const candidates = [
      recordCreatedEvent.get(record.id),
      recordLifecycleEvent.get(record.id),
      ...fields.map(field => eventById.get(record.field_event_ids[field] ?? '')),
    ].filter((event): event is DomainEvent => Boolean(event))
    return candidates.reduce<DomainEvent | undefined>((winner, event) => isLater(event, winner) ? event : winner, undefined)
  }
}

export function normalizeBandNumber(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toUpperCase()
}

function recordIdFrom(event: DomainEvent): UuidV7 | undefined {
  if (!event.event_type.startsWith('banding-record.')) return undefined
  const recordId = (event.payload as Record<string, unknown>).record_id
  return typeof recordId === 'string' ? recordId : undefined
}

function managedSelection(value: unknown): { band_id: UuidV7 } | undefined {
  if (!value || typeof value !== 'object') return undefined
  const selection = value as { kind?: unknown; band_id?: unknown }
  return selection.kind === 'managed' && typeof selection.band_id === 'string' ? { band_id: selection.band_id } : undefined
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

function isLater(candidate: DomainEvent, previous: DomainEvent | undefined): boolean {
  return !previous || compareEventOrder(candidate, previous) > 0
}
