/**
 * Pure Phase 30 pilot commands and projection. The Interface accepts only
 * Workspace/user identity plus an HLC supplied by the durable Field replica;
 * storage, sync, and provider details remain outside this Module.
 */
import {
  compareEventOrder,
  createEvent,
  createUuidV7,
  type DomainEvent,
  type HybridLogicalClock,
  type UuidV7,
} from '@birdnerd/events'

export type PilotActor = { kind: 'user-account'; user_account_id: UuidV7 }

export type SessionFields = {
  session_date?: string
  location_name?: string
  protocol?: string
  notes?: string
}

export type BandingRecordFields = {
  band_number?: string
  species_code?: string
  age?: string
  sex?: string
  capture_time?: string
  notes?: string
}

export type PilotSession = SessionFields & {
  session_id: UuidV7
  created_by: UuidV7
}

export type PilotBandingRecord = BandingRecordFields & {
  record_id: UuidV7
  session_id: UuidV7
  created_by: UuidV7
  field_event_ids: Readonly<Partial<Record<keyof BandingRecordFields, UuidV7>>>
}

export type BandAllocationConflict = {
  band_number: string
  record_ids: readonly UuidV7[]
}

export type PilotProjection = {
  sessions: ReadonlyMap<UuidV7, PilotSession>
  banding_records: ReadonlyMap<UuidV7, PilotBandingRecord>
  band_allocation_conflicts: readonly BandAllocationConflict[]
}

/**
 * Select only fields that the editor actually changed. This keeps concurrent
 * edits to different fields independent while preserving an empty string as
 * an intentional clear of an optional value.
 */
export function changedBandingRecordFields(
  current: BandingRecordFields,
  proposed: BandingRecordFields,
): BandingRecordFields {
  const changed: BandingRecordFields = {}
  for (const [field, nextValue] of Object.entries(proposed) as [keyof BandingRecordFields, string | undefined][]) {
    if (nextValue !== undefined && nextValue !== (current[field] ?? '')) changed[field] = nextValue
  }
  return changed
}

type CommandContext = {
  workspace_id: UuidV7
  actor: PilotActor
  hlc: HybridLogicalClock
  occurred_at?: string
  command_id?: UuidV7
}

export function decideCreateSession(
  context: CommandContext,
  fields: SessionFields & { session_id?: UuidV7 },
): DomainEvent<'session.created'> {
  return createEvent({
    ...context,
    command_id: context.command_id ?? createUuidV7(),
    event_type: 'session.created',
    payload: compact({ ...fields, session_id: fields.session_id ?? createUuidV7() }),
  })
}

export function decideCreateBandingRecord(
  events: readonly DomainEvent[],
  context: CommandContext,
  fields: BandingRecordFields & { session_id: UuidV7; record_id?: UuidV7 },
): DomainEvent<'banding-record.created'> {
  const projection = projectPilotBanding(events)
  if (!projection.sessions.has(fields.session_id)) throw new Error('Banding Record Session does not exist.')
  return createEvent({
    ...context,
    command_id: context.command_id ?? createUuidV7(),
    event_type: 'banding-record.created',
    payload: compact({ ...fields, record_id: fields.record_id ?? createUuidV7() }),
  })
}

export function decideAmendBandingRecord(
  events: readonly DomainEvent[],
  context: CommandContext,
  recordId: UuidV7,
  fields: BandingRecordFields,
): DomainEvent<'banding-record.fields-amended'> {
  if (!projectPilotBanding(events).banding_records.has(recordId)) throw new Error('Banding Record does not exist.')
  if (Object.keys(fields).length === 0) throw new Error('At least one Banding Record field must be amended.')
  return createEvent({
    ...context,
    command_id: context.command_id ?? createUuidV7(),
    event_type: 'banding-record.fields-amended',
    payload: { record_id: recordId, fields: compact(fields) },
  })
}

/** Replay the operational pilot catalog with HLC/event-ID field-level LWW. */
export function projectPilotBanding(events: readonly DomainEvent[]): PilotProjection {
  const sessions = new Map<UuidV7, PilotSession>()
  const records = new Map<UuidV7, PilotBandingRecord>()
  const fieldWinners = new Map<UuidV7, Map<keyof BandingRecordFields, DomainEvent>>()

  for (const event of events) {
    if (event.event_type === 'session.created' && event.actor.kind === 'user-account') {
      sessions.set(event.payload.session_id, {
        ...event.payload,
        created_by: event.actor.user_account_id,
      })
    }
    if (event.event_type === 'banding-record.created' && event.actor.kind === 'user-account') {
      records.set(event.payload.record_id, {
        ...event.payload,
        created_by: event.actor.user_account_id,
        field_event_ids: {},
      })
    }
  }

  for (const event of events) {
    if (event.event_type === 'banding-record.created') {
      applyFields(event.payload.record_id, bandingFields(event.payload), event)
    } else if (event.event_type === 'banding-record.fields-amended') {
      applyFields(event.payload.record_id, event.payload.fields, event)
    }
  }

  const allocations = new Map<string, UuidV7[]>()
  for (const record of records.values()) {
    if (!record.band_number) continue
    allocations.set(record.band_number, [...(allocations.get(record.band_number) ?? []), record.record_id])
  }
  const conflicts = [...allocations.entries()]
    .filter(([, recordIds]) => recordIds.length > 1)
    .map(([band_number, record_ids]) => ({ band_number, record_ids: record_ids.sort() }))
    .sort((left, right) => left.band_number.localeCompare(right.band_number))

  return { sessions, banding_records: records, band_allocation_conflicts: conflicts }

  function applyFields(recordId: UuidV7, fields: BandingRecordFields, event: DomainEvent): void {
    const record = records.get(recordId)
    if (!record) return
    const winners = fieldWinners.get(recordId) ?? new Map<keyof BandingRecordFields, DomainEvent>()
    const next = { ...record, field_event_ids: { ...record.field_event_ids } }
    for (const [field, value] of Object.entries(fields) as [keyof BandingRecordFields, string][]) {
      const winner = winners.get(field)
      if (winner && compareEventOrder(event, winner) <= 0) continue
      next[field] = value
      next.field_event_ids[field] = event.event_id
      winners.set(field, event)
    }
    fieldWinners.set(recordId, winners)
    records.set(recordId, next)
  }
}

function bandingFields(payload: DomainEvent<'banding-record.created'>['payload']): BandingRecordFields {
  const { record_id: _recordId, session_id: _sessionId, ...fields } = payload
  return fields
}

function compact<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T
}
