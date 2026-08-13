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
} from './generated/eventBindings.js'

import type { DomainEvent, EventActor, EventPayloadByType, EventType } from './generated/eventBindings.js'

/** A canonical lower-case UUIDv7 string used by every Workspace-owned identifier. */
export type UuidV7 = string

/** The only external identity accepted in the first collaboration release. */
export type ExternalIdentity = Extract<EventActor, { kind: 'external-identity' }>['identity']

/** Authorization role assigned by a Workspace Membership, separate from banding roles. */
export type WorkspaceMembershipRole = EventPayloadByType['membership.preauthorized']['role']

/** Input for an event create command. IDs and time default locally; schema version is contract-owned. */
export type CreateEventInput<T extends EventType> = Omit<DomainEvent<T>, 'event_id' | 'event_schema_version' | 'occurred_at'> & {
  event_id?: UuidV7
  occurred_at?: string
}

const UUID_V7_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

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
  const event = {
    ...input,
    event_id: input.event_id ?? createUuidV7(),
    event_schema_version: 1,
    occurred_at: input.occurred_at ?? new Date().toISOString(),
  } as DomainEvent<T>
  assertEvent(event)
  return event
}

/** Validate a current event envelope, its selected payload contract, and canonical invariants. */
export function assertEvent(value: unknown): asserts value is DomainEvent {
  const contractError = validateGeneratedEvent(value)
  if (contractError) throw new Error(contractError)
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
  assertEvent(value)
  return value
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
