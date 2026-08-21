/**
 * Portable Domain Event API. Contract-derived types and structural validation
 * are generated from `schemas/workspace`; this module adds UUIDv7 creation,
 * canonical cross-contract invariants, JSON codecs, and the explicit v1
 * upcast boundary. Projectors and domain decisions intentionally live outside
 * this package.
 */
import { validateGeneratedEvent } from './generated/eventBindings.js'

export {
  EVENT_TYPES,
  validateGeneratedEvent,
  type DomainEvent,
  type EventActor,
  type EventPayloadByType,
  type EventType,
  type LegacyDomainEvent,
} from './generated/eventBindings.js'

import type { DomainEvent, EventActor, EventPayloadByType, EventType, LegacyDomainEvent } from './generated/eventBindings.js'

/** A canonical lower-case UUIDv7 string used by every Workspace-owned identifier. */
export type UuidV7 = string

/** The only external identity accepted in the first collaboration release. */
export type ExternalIdentity = Extract<EventActor, { kind: 'external-identity' }>['identity']

/** Authorization role assigned by a Workspace Membership, separate from banding roles. */
export type WorkspaceMembershipRole = EventPayloadByType['membership.preauthorized']['role']

/** Hybrid Logical Clock carried by every current Event envelope. */
export type HybridLogicalClock = DomainEvent['hlc']

/** Input for an event create command. IDs and time default locally; schema version is contract-owned. */
export type CreateEventInput<T extends EventType> = Omit<DomainEvent<T>, 'event_id' | 'event_schema_version' | 'event_envelope_version' | 'occurred_at' | 'hlc'> & {
  event_id?: UuidV7
  occurred_at?: string
  hlc?: HybridLogicalClock
}

const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const LEGACY_EVENT_TYPES = new Set<EventType>([
  'workspace.created',
  'membership.preauthorized',
  'user-account.linked',
  'membership.activated',
])

/** Current write version is selected per Event type, not by the envelope. */
const CURRENT_SCHEMA_VERSION: Partial<Record<EventType, number>> = {
  'session.created': 2,
  'banding-record.created': 2,
  'banding-record.fields-amended': 2,
}

function fillRandom(bytes: Uint8Array): Uint8Array {
  globalThis.crypto.getRandomValues(bytes as Uint8Array<ArrayBuffer>)
  return bytes
}

/** Create a locally usable RFC 9562 UUIDv7 without a clock or network dependency. */
export function createUuidV7(now = Date.now(), random: (bytes: Uint8Array) => Uint8Array = fillRandom): UuidV7 {
  if (!Number.isSafeInteger(now) || now < 0 || now >= 2 ** 48) {
    throw new Error('UUIDv7 timestamp must fit in 48 bits.')
  }

  const bytes = random(new Uint8Array(16))
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = now % 256
    now = Math.floor(now / 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function isUuidV7(value: unknown): value is UuidV7 {
  return typeof value === 'string' && UUID_V7_PATTERN.test(value)
}

/** Normalize an identity email before it is placed in a canonical Domain Event. */
export function canonicalizeEmail(email: string): string {
  const canonical = email.trim().toLowerCase()
  if (!canonical || !canonical.includes('@')) throw new Error('A valid email address is required.')
  return canonical
}

/** Create and validate a current Event Contract version. */
export function createEvent<T extends EventType>(input: CreateEventInput<T>): DomainEvent<T> {
  const occurredAt = input.occurred_at ?? new Date().toISOString()
  const event = {
    ...input,
    event_id: input.event_id ?? createUuidV7(),
    event_schema_version: CURRENT_SCHEMA_VERSION[input.event_type] ?? 1,
    event_envelope_version: 2,
    occurred_at: occurredAt,
    hlc: input.hlc ?? { physical_ms: parseRfc3339Milliseconds(occurredAt), logical: 0 },
  } as DomainEvent<T>
  assertEvent(event)
  return event
}

/** Validate a current v2 event envelope, selected payload contract, and canonical invariants. */
export function assertEvent(value: unknown): asserts value is DomainEvent {
  const contractError = validateGeneratedEvent(value)
  if (contractError) throw new Error(contractError)
  if (!isRecord(value) || value.event_envelope_version !== 2) throw new Error('A current Event must use envelope version 2.')
  assertCanonicalValues(value)

  const event = value as DomainEvent
  if (event.event_type === 'workspace.created' && event.workspace_id !== event.payload.workspace_id) {
    throw new Error('workspace.created must target its payload workspace.')
  }
}

/** Decode a JSON Event Log and upcast every entry before making it available to a projector. */
export function decodeEventLog(serialized: string): DomainEvent[] {
  const decoded: unknown = JSON.parse(serialized)
  if (!Array.isArray(decoded)) throw new Error('An Event Log must be a JSON array.')
  return decoded.map(upcastEvent)
}

/** Serialize only Events that satisfy their current contract and canonical invariants. */
export function encodeEventLog(events: readonly DomainEvent[]): string {
  events.forEach(assertEvent)
  return `${JSON.stringify(events, null, 2)}\n`
}

/**
 * Compatibility boundary for replay. V1 has no historical predecessor yet;
 * later contract versions extend this function rather than making projectors
 * reason about old payload shapes.
 */
export function upcastEvent(value: unknown): DomainEvent {
  if (isRecord(value) && value.event_envelope_version === 2) {
    assertEvent(value)
    const currentVersion = CURRENT_SCHEMA_VERSION[value.event_type as EventType] ?? 1
    return value.event_schema_version === currentVersion
      ? value as DomainEvent
      : ({ ...value, event_schema_version: currentVersion } as DomainEvent)
  }

  // Give the compatibility error its domain meaning before the historical
  // envelope validator rejects a current per-type schema number.
  if (isRecord(value) && typeof value.event_type === 'string' && !LEGACY_EVENT_TYPES.has(value.event_type as EventType)) {
    throw new Error(`${value.event_type} was introduced with Event envelope version 2 and cannot be decoded as v1.`)
  }

  const contractError = validateGeneratedEvent(value)
  if (contractError) throw new Error(contractError)
  assertCanonicalValues(value)
  const legacy = value as LegacyDomainEvent
  if (!LEGACY_EVENT_TYPES.has(legacy.event_type)) {
    throw new Error(`${legacy.event_type} was introduced with Event envelope version 2 and cannot be decoded as v1.`)
  }
  const event = {
    ...legacy,
    event_envelope_version: 2 as const,
    hlc: { physical_ms: parseRfc3339Milliseconds(legacy.occurred_at), logical: 0 },
  }
  assertEvent(event)
  return event
}

/** Compare immutable Event JSON by value, independent of object property order. */
export function sameEventContent(left: DomainEvent, right: DomainEvent): boolean {
  return canonicalJson(left) === canonicalJson(right)
}

/**
 * Convert validated RFC 3339 text to Unix milliseconds without delegating
 * protocol parsing to `Date.parse`. Fractional precision is truncated/padded
 * to milliseconds and `:60` is normalized as `:59` plus one second.
 */
export function parseRfc3339Milliseconds(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?([Zz]|([+-])(\d{2}):(\d{2}))$/.exec(value)
  if (!match) throw new Error('occurred_at must be an RFC 3339 date-time.')
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fraction = '', zone, sign, offsetHourText, offsetMinuteText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const second = Number(secondText)
  const daysInMonth = month === 2
    ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28)
    : [4, 6, 9, 11].includes(month) ? 30 : 31
  const offsetHour = zone.toLowerCase() === 'z' ? 0 : Number(offsetHourText)
  const offsetMinute = zone.toLowerCase() === 'z' ? 0 : Number(offsetMinuteText)
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth || hour > 23 || minute > 59 || second > 60 || offsetHour > 23 || offsetMinute > 59) {
    throw new Error('occurred_at must be an RFC 3339 date-time.')
  }

  const milliseconds = Number(fraction.slice(0, 3).padEnd(3, '0'))
  const normalizedSecond = Math.min(second, 59)
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(hour, minute, normalizedSecond, milliseconds)
  const offset = (offsetHour * 60 + offsetMinute) * 60_000 * (sign === '-' ? -1 : 1)
  const result = date.getTime() - offset + (second === 60 ? 1_000 : 0)
  if (!Number.isSafeInteger(result) || result < 0) throw new Error('occurred_at must map to non-negative safe Unix milliseconds.')
  return result
}

/** Advance a local HLC for a new write, including wall-clock regression. */
export function tickHlc(local: HybridLogicalClock | undefined, now = Date.now()): HybridLogicalClock {
  assertClockValue({ physical_ms: now, logical: 0 })
  if (!local) return { physical_ms: now, logical: 0 }
  assertClockValue(local)
  return now > local.physical_ms
    ? { physical_ms: now, logical: 0 }
    : { physical_ms: local.physical_ms, logical: incrementLogical(local.logical) }
}

/** Observe a remote HLC and advance beyond every causally visible clock. */
export function observeHlc(local: HybridLogicalClock, remote: HybridLogicalClock, now = Date.now()): HybridLogicalClock {
  assertClockValue(local)
  assertClockValue(remote)
  assertClockValue({ physical_ms: now, logical: 0 })
  const physicalMs = Math.max(local.physical_ms, remote.physical_ms, now)
  if (now > local.physical_ms && now > remote.physical_ms) return { physical_ms: now, logical: 0 }
  if (local.physical_ms === physicalMs && remote.physical_ms === physicalMs) {
    return { physical_ms: physicalMs, logical: incrementLogical(Math.max(local.logical, remote.logical)) }
  }
  return local.physical_ms === physicalMs
    ? { physical_ms: physicalMs, logical: incrementLogical(local.logical) }
    : { physical_ms: physicalMs, logical: incrementLogical(remote.logical) }
}

/** Compare HLC tuples, then immutable Event IDs for deterministic LWW. */
export function compareEventOrder(
  left: Pick<DomainEvent, 'hlc' | 'event_id'>,
  right: Pick<DomainEvent, 'hlc' | 'event_id'>,
): number {
  return left.hlc.physical_ms - right.hlc.physical_ms
    || left.hlc.logical - right.hlc.logical
    || left.event_id.localeCompare(right.event_id)
}

function assertClockValue(clock: HybridLogicalClock): void {
  if (!Number.isSafeInteger(clock.physical_ms) || clock.physical_ms < 0 || !Number.isSafeInteger(clock.logical) || clock.logical < 0) {
    throw new Error('HLC values must be non-negative safe integers.')
  }
}

function incrementLogical(logical: number): number {
  if (logical === Number.MAX_SAFE_INTEGER) throw new Error('HLC logical counter overflow.')
  return logical + 1
}

function assertCanonicalValues(value: unknown, key?: string): void {
  if (typeof value === 'string') {
    if (key?.endsWith('_id') && key !== 'provisioner_id' && !isUuidV7(value)) {
      throw new Error(`${key} must be a canonical UUIDv7.`)
    }
    if (key === 'email' && value !== canonicalizeEmail(value)) {
      throw new Error('Event email values must be canonicalized.')
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach(entry => assertCanonicalValues(entry))
    return
  }
  if (isRecord(value)) {
    Object.entries(value).forEach(([childKey, childValue]) => assertCanonicalValues(childValue, childKey))
  }
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(sortJsonValue(value))
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue)
  if (!isRecord(value)) return value
  return Object.fromEntries(
    Object.keys(value).sort().map(key => [key, sortJsonValue(value[key])]),
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
