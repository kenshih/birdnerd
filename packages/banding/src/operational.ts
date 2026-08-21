/**
 * Phase 31's operational Module. Callers submit one command and receive facts
 * plus soft warnings; this Module owns replay, lifecycle, role feedback and
 * field-level LWW. Storage, transport and React deliberately stay outside.
 */
import { compareEventOrder, createEvent, createUuidV7, type DomainEvent, type EventType, type HybridLogicalClock, type UuidV7, type WorkspaceMembershipRole } from '@birdnerd/events'

export type OperationalEntityKind = 'station' | 'net' | 'person' | 'bander' | 'band' | 'session' | 'banding-record'
export type OperationalEntity = { id: UuidV7; kind: OperationalEntityKind; fields: Record<string, unknown>; active: boolean; field_event_ids: Record<string, string> }
export type OperationalProjection = {
  entities: ReadonlyMap<UuidV7, OperationalEntity>
  session_crew: ReadonlySet<string>
  person_by_user_account: ReadonlyMap<UuidV7, UuidV7>
  unresolved_references: readonly { event_id: string; reference_id: string; expected_kind: OperationalEntityKind }[]
  band_number_conflicts: readonly { band_number: string; band_ids: readonly UuidV7[] }[]
  band_allocation_conflicts: readonly { band_id: UuidV7; record_ids: readonly UuidV7[] }[]
}

export type OperationalCommand =
  | { kind: 'create'; entity_kind: OperationalEntityKind; entity_id?: UuidV7; fields?: Record<string, unknown> }
  | { kind: 'amend'; entity_kind: OperationalEntityKind; entity_id: UuidV7; fields: Record<string, unknown> }
  | { kind: 'deactivate' | 'reactivate'; entity_kind: OperationalEntityKind; entity_id: UuidV7 }
  | { kind: 'receive-bands'; bands: readonly { band_id?: UuidV7; band_number: string; fields?: Record<string, unknown> }[] }
  | { kind: 'set-session-crew'; session_id: UuidV7; bander_id: UuidV7; present: boolean }
  | { kind: 'link-user-account-person'; user_account_id: UuidV7; person_id?: UuidV7 }

export type OperationalDecision = { events: readonly DomainEvent[]; warnings: readonly string[] }
export type OperationalCommandContext = { workspace_id: UuidV7; user_account_id: UuidV7; role: WorkspaceMembershipRole; command_id?: UuidV7; occurred_at?: string; hlc: HybridLogicalClock }

const ADMIN_KINDS = new Set<OperationalEntityKind>(['station', 'net', 'person', 'bander'])
const ENTITY_ID_KEY: Record<OperationalEntityKind, string> = { station: 'station_id', net: 'net_id', person: 'person_id', bander: 'bander_id', band: 'band_id', session: 'session_id', 'banding-record': 'record_id' }
const CREATE_TYPE: Record<OperationalEntityKind, EventType> = { station: 'station.created', net: 'net.created', person: 'person.created', bander: 'bander.created', band: 'band.received', session: 'session.created', 'banding-record': 'banding-record.created' }

/** Decide a role-checked local command. Soft warnings never suppress facts. */
export function decideOperationalCommand(projection: OperationalProjection, context: OperationalCommandContext, command: OperationalCommand): OperationalDecision {
  const eventContext = { workspace_id: context.workspace_id, command_id: context.command_id ?? createUuidV7(), occurred_at: context.occurred_at, hlc: context.hlc, actor: { kind: 'user-account' as const, user_account_id: context.user_account_id } }
  const needsAdmin = command.kind === 'link-user-account-person' || (command.kind !== 'receive-bands' && command.kind !== 'set-session-crew' && ADMIN_KINDS.has(command.entity_kind))
  if (needsAdmin && context.role !== 'admin') throw new Error('Admin role is required for Workspace configuration.')
  if (command.kind === 'receive-bands') return { events: command.bands.map(band => createEvent({ ...eventContext, event_type: 'band.received', payload: { band_id: band.band_id ?? createUuidV7(), band_number: band.band_number, fields: band.fields ?? {} } })), warnings: [] }
  if (command.kind === 'set-session-crew') return { events: [createEvent({ ...eventContext, event_type: command.present ? 'session-crew-member.added' : 'session-crew-member.removed', payload: { session_id: command.session_id, bander_id: command.bander_id } })], warnings: [] }
  if (command.kind === 'link-user-account-person') return { events: [createEvent({ ...eventContext, event_type: command.person_id ? 'user-account.person-linked' : 'user-account.person-unlinked', payload: command.person_id ? { user_account_id: command.user_account_id, person_id: command.person_id } : { user_account_id: command.user_account_id } })], warnings: [] }
  const id = command.kind === 'create' ? command.entity_id ?? createUuidV7() : command.entity_id
  if (command.kind !== 'create' && !projection.entities.has(id)) throw new Error(`${command.entity_kind} does not exist.`)
  if (command.kind === 'create') {
    const idKey = ENTITY_ID_KEY[command.entity_kind]
    return { events: [createEvent({ ...eventContext, event_type: CREATE_TYPE[command.entity_kind], payload: { [idKey]: id, ...(command.entity_kind === 'band' ? { band_number: String(command.fields?.band_number ?? '') } : {}), ...(command.fields ? { fields: command.fields } : {}) } as never })], warnings: [] }
  }
  const suffix = command.kind === 'amend' ? 'fields-amended' : command.kind === 'deactivate' ? 'deactivated' : 'reactivated'
  const event_type = `${command.entity_kind}.${suffix}` as EventType
  return { events: [createEvent({ ...eventContext, event_type, payload: { [ENTITY_ID_KEY[command.entity_kind]]: id, ...(command.kind === 'amend' ? { fields: command.fields } : {}) } as never })], warnings: [] }
}

/** Replay facts in any order. Lifecycle facts never alter field winners. */
export function projectOperationalEvents(events: readonly DomainEvent[]): OperationalProjection {
  const entities = new Map<UuidV7, OperationalEntity>()
  const winners = new Map<UuidV7, Map<string, DomainEvent>>()
  const crew = new Map<string, DomainEvent>()
  const links = new Map<UuidV7, { person_id?: UuidV7; event: DomainEvent }>()
  const unresolved: { event_id: string; reference_id: string; expected_kind: OperationalEntityKind }[] = []
  for (const event of events) {
    const type = event.event_type
    const created = creationKind(type)
    if (created) { const id = String((event.payload as Record<string, unknown>)[ENTITY_ID_KEY[created]]) as UuidV7; apply(created, id, fieldsFrom(event), true, event); continue }
    const lifecycle = lifecycleKind(type)
    if (lifecycle) { const { kind, action } = lifecycle; const id = String((event.payload as Record<string, unknown>)[ENTITY_ID_KEY[kind]]) as UuidV7; const existing = entities.get(id); if (!existing) { unresolved.push({ event_id: event.event_id, reference_id: id, expected_kind: kind }); continue }; if (action === 'amend') apply(kind, id, fieldsFrom(event), existing.active, event); else if (isLater(event, (existing as OperationalEntity & { lifecycle_event?: DomainEvent }).lifecycle_event)) { entities.set(id, { ...existing, active: action === 'reactivate', lifecycle_event: event } as OperationalEntity); } ; continue }
    if (type === 'session-crew-member.added' || type === 'session-crew-member.removed') { const p = event.payload as { session_id: string; bander_id: string }; const key = `${p.session_id}:${p.bander_id}`; if (isLater(event, crew.get(key))) crew.set(key, event); continue }
    if (type === 'user-account.person-linked' || type === 'user-account.person-unlinked') { const p = event.payload as { user_account_id: UuidV7; person_id?: UuidV7 }; const existing = links.get(p.user_account_id); if (!existing || isLater(event, existing.event)) links.set(p.user_account_id, { person_id: p.person_id, event }); }
  }
  const byNumber = new Map<string, UuidV7[]>()
  for (const e of entities.values()) if (e.kind === 'band' && e.active && typeof e.fields.band_number === 'string') byNumber.set(normalizeBand(e.fields.band_number), [...(byNumber.get(normalizeBand(e.fields.band_number)) ?? []), e.id])
  const allocation = new Map<UuidV7, UuidV7[]>()
  for (const e of entities.values()) if (e.kind === 'banding-record' && e.active && e.fields.band_selection && typeof e.fields.band_selection === 'object') { const s = e.fields.band_selection as { kind?: string; band_id?: UuidV7 }; if (s.kind === 'managed' && s.band_id && isNewDeployment(e.fields.capture_code)) allocation.set(s.band_id, [...(allocation.get(s.band_id) ?? []), e.id]) }
  return { entities, session_crew: new Set([...crew].filter(([, event]) => event.event_type === 'session-crew-member.added').map(([key]) => key)), person_by_user_account: new Map([...links].filter(([, link]) => link.person_id).map(([id, link]) => [id, link.person_id!])), unresolved_references: unresolved, band_number_conflicts: [...byNumber].filter(([, ids]) => ids.length > 1).map(([band_number, band_ids]) => ({ band_number, band_ids })), band_allocation_conflicts: [...allocation].filter(([, ids]) => ids.length > 1).map(([band_id, record_ids]) => ({ band_id, record_ids })) }
  function apply(kind: OperationalEntityKind, id: UuidV7, fields: Record<string, unknown>, active: boolean, event: DomainEvent) { const existing = entities.get(id) ?? { id, kind, fields: {}, active, field_event_ids: {} }; const eventWinners = winners.get(id) ?? new Map<string, DomainEvent>(); const next = { ...existing, fields: { ...existing.fields }, field_event_ids: { ...existing.field_event_ids } }; for (const [field, value] of Object.entries(fields)) if (isLater(event, eventWinners.get(field))) { next.fields[field] = value; next.field_event_ids[field] = event.event_id; eventWinners.set(field, event) }; winners.set(id, eventWinners); entities.set(id, next) }
}

function creationKind(type: EventType): OperationalEntityKind | undefined { return type === 'station.created' ? 'station' : type === 'net.created' ? 'net' : type === 'person.created' ? 'person' : type === 'bander.created' ? 'bander' : type === 'band.received' ? 'band' : type === 'session.created' ? 'session' : type === 'banding-record.created' ? 'banding-record' : undefined }
function lifecycleKind(type: EventType): { kind: OperationalEntityKind; action: 'amend' | 'deactivate' | 'reactivate' } | undefined { const match = /^(station|net|person|bander|band|session|banding-record)\.(fields-amended|deactivated|reactivated)$/.exec(type); return match ? { kind: match[1] as OperationalEntityKind, action: match[2] === 'fields-amended' ? 'amend' : match[2] === 'deactivated' ? 'deactivate' : 'reactivate' } : undefined }
function fieldsFrom(event: DomainEvent): Record<string, unknown> { const p = event.payload as Record<string, unknown>; return typeof p.fields === 'object' && p.fields !== null ? p.fields as Record<string, unknown> : Object.fromEntries(Object.entries(p).filter(([key]) => !key.endsWith('_id') && key !== 'band_number')) }
function isLater(candidate: DomainEvent, previous: DomainEvent | undefined): boolean { return !previous || compareEventOrder(candidate, previous) > 0 }
function normalizeBand(value: string): string { return value.replace(/[^a-z0-9]/gi, '').toUpperCase() }
function isNewDeployment(value: unknown): boolean { return value === '1' || value === 'N' }
