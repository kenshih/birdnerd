/**
 * TEMPORARY Phase 28 implementation. These draft TypeScript types and
 * validators bridge the local Workspace slice only. In Phase 29 they must be
 * generated from the YAML Event Contracts in /schemas, with CI drift checks;
 * do not extend this handwritten implementation for field-work events.
 */

export type UuidV7 = string

export type MembershipRole = 'admin' | 'contributor'

export type ExternalIdentity = {
  provider: 'google'
  subject: string
  email: string
}

export type EventActor =
  | { kind: 'restricted-provisioner'; provisioner_id: string }
  | { kind: 'external-identity'; identity: ExternalIdentity }
  | { kind: 'user-account'; user_account_id: UuidV7 }

export type WorkspaceCreatedPayload = {
  workspace_id: UuidV7
  name: string
}

export type MembershipPreauthorizedPayload = {
  membership_id: UuidV7
  email: string
  role: MembershipRole
}

export type UserAccountLinkedPayload = {
  user_account_id: UuidV7
  identity: ExternalIdentity
}

export type MembershipActivatedPayload = {
  membership_id: UuidV7
  user_account_id: UuidV7
}

export type EventPayloadByType = {
  'workspace.created': WorkspaceCreatedPayload
  'membership.preauthorized': MembershipPreauthorizedPayload
  'user-account.linked': UserAccountLinkedPayload
  'membership.activated': MembershipActivatedPayload
}

export type EventType = keyof EventPayloadByType

export type DomainEvent<T extends EventType = EventType> = T extends EventType ? {
  event_id: UuidV7
  event_type: T
  event_schema_version: 1
  workspace_id: UuidV7
  command_id: UuidV7
  occurred_at: string
  actor: EventActor
  payload: EventPayloadByType[T]
} : never

export type DraftEventInput<T extends EventType> = Omit<DomainEvent<T>, 'event_id' | 'event_schema_version' | 'occurred_at'> & {
  event_id?: UuidV7
  occurred_at?: string
}

const EVENT_TYPES: readonly EventType[] = [
  'workspace.created',
  'membership.preauthorized',
  'user-account.linked',
  'membership.activated',
]

function fillRandom(bytes: Uint8Array): Uint8Array {
  globalThis.crypto.getRandomValues(bytes as Uint8Array<ArrayBuffer>)
  return bytes
}

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

export function canonicalizeEmail(email: string): string {
  const canonical = email.trim().toLowerCase()
  if (!canonical || !canonical.includes('@')) throw new Error('A valid email address is required.')
  return canonical
}

export function createDraftEvent<T extends EventType>(input: DraftEventInput<T>): DomainEvent<T> {
  const event = {
    ...input,
    event_id: input.event_id ?? createUuidV7(),
    event_schema_version: 1,
    occurred_at: input.occurred_at ?? new Date().toISOString(),
  } as DomainEvent<T>
  assertDraftEvent(event)
  return event
}

export function encodeDraftEventLog(events: readonly DomainEvent[]): string {
  events.forEach(assertDraftEvent)
  return `${JSON.stringify(events, null, 2)}\n`
}

export function decodeDraftEventLog(serialized: string): DomainEvent[] {
  const decoded: unknown = JSON.parse(serialized)
  if (!Array.isArray(decoded)) throw new Error('The draft event log must be a JSON array.')
  decoded.forEach(assertDraftEvent)
  return decoded
}

export function assertDraftEvent(value: unknown): asserts value is DomainEvent {
  if (!isRecord(value)) throw new Error('A Domain Event must be an object.')
  assertString(value.event_id, 'event_id')
  if (!isEventType(value.event_type)) throw new Error('Unsupported draft event type.')
  if (value.event_schema_version !== 1) throw new Error('Unsupported draft event schema version.')
  assertString(value.workspace_id, 'workspace_id')
  assertString(value.command_id, 'command_id')
  assertString(value.occurred_at, 'occurred_at')
  if (Number.isNaN(Date.parse(value.occurred_at))) throw new Error('occurred_at must be an ISO date-time.')
  assertActor(value.actor)
  assertPayload(value.event_type, value.payload, value.workspace_id)
}

function assertActor(value: unknown): asserts value is EventActor {
  if (!isRecord(value) || typeof value.kind !== 'string') throw new Error('A Domain Event actor is required.')
  if (value.kind === 'restricted-provisioner') {
    assertString(value.provisioner_id, 'actor.provisioner_id')
    return
  }
  if (value.kind === 'user-account') {
    assertString(value.user_account_id, 'actor.user_account_id')
    return
  }
  if (value.kind === 'external-identity') {
    assertIdentity(value.identity)
    return
  }
  throw new Error('Unsupported Domain Event actor.')
}

function assertPayload(eventType: EventType, value: unknown, workspaceId: string): void {
  if (!isRecord(value)) throw new Error('A Domain Event payload must be an object.')
  if (eventType === 'workspace.created') {
    assertString(value.workspace_id, 'payload.workspace_id')
    assertString(value.name, 'payload.name')
    if (value.workspace_id !== workspaceId) throw new Error('workspace.created must target its payload workspace.')
    return
  }
  if (eventType === 'membership.preauthorized') {
    assertString(value.membership_id, 'payload.membership_id')
    assertString(value.email, 'payload.email')
    if (value.email !== canonicalizeEmail(value.email)) throw new Error('Pre-authorized email must be canonicalized.')
    if (value.role !== 'admin' && value.role !== 'contributor') throw new Error('Unsupported Membership role.')
    return
  }
  if (eventType === 'user-account.linked') {
    assertString(value.user_account_id, 'payload.user_account_id')
    assertIdentity(value.identity)
    return
  }
  assertString(value.membership_id, 'payload.membership_id')
  assertString(value.user_account_id, 'payload.user_account_id')
}

function assertIdentity(value: unknown): asserts value is ExternalIdentity {
  if (!isRecord(value)) throw new Error('An external identity is required.')
  if (value.provider !== 'google') throw new Error('Only the Google identity provider is supported.')
  assertString(value.subject, 'identity.subject')
  assertString(value.email, 'identity.email')
  if (value.email !== canonicalizeEmail(value.email)) throw new Error('Identity email must be canonicalized.')
}

function isEventType(value: unknown): value is EventType {
  return typeof value === 'string' && EVENT_TYPES.includes(value as EventType)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} must be a non-empty string.`)
}
