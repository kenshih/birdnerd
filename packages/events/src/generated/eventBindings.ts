/*
 * GENERATED FILE — do not edit by hand.
 * Run `npm run generate:event-bindings` after changing these contract sources:
 * - schemas/workspace/event-envelope.v1.yaml
 * - schemas/workspace/membership-activated.v1.yaml
 * - schemas/workspace/membership-preauthorized.v1.yaml
 * - schemas/workspace/user-account-linked.v1.yaml
 * - schemas/workspace/workspace-created.v1.yaml
 */

export type EventType = "membership.activated" | "membership.preauthorized" | "user-account.linked" | "workspace.created"

export type EventPayloadByType = {
  "membership.activated": { "membership_id": string; "user_account_id": string }
  "membership.preauthorized": { "membership_id": string; "email": string; "role": "admin" | "contributor" }
  "user-account.linked": { "user_account_id": string; "identity": { "provider": "google"; "subject": string; "email": string } }
  "workspace.created": { "workspace_id": string; "name": string }
}

type EventEnvelope = { "event_id": string; "event_type": string; "event_schema_version": 1; "workspace_id": string; "command_id": string; "occurred_at": string; "actor": { "kind": "restricted-provisioner"; "provisioner_id": string } | { "kind": "external-identity"; "identity": { "provider": "google"; "subject": string; "email": string } } | { "kind": "user-account"; "user_account_id": string }; "payload": Record<string, unknown> }

export type EventActor = EventEnvelope['actor']

export type DomainEvent<T extends EventType = EventType> = T extends EventType
  ? Omit<EventEnvelope, 'event_type' | 'payload'> & { event_type: T; payload: EventPayloadByType[T] }
  : never

export const EVENT_TYPES: readonly EventType[] = ["membership.activated", "membership.preauthorized", "user-account.linked", "workspace.created"]

const EVENT_TYPE_BY_NAME: Readonly<Record<EventType, EventType>> = {
  "membership.activated": "membership.activated",
  "membership.preauthorized": "membership.preauthorized",
  "user-account.linked": "user-account.linked",
  "workspace.created": "workspace.created",
}

const EVENT_ENVELOPE_SCHEMA = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "BirdNerd Domain Event envelope",
  "type": "object",
  "required": [
    "event_id",
    "event_type",
    "event_schema_version",
    "workspace_id",
    "command_id",
    "occurred_at",
    "actor",
    "payload"
  ],
  "properties": {
    "event_id": {
      "type": "string",
      "format": "uuid",
      "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
      "description": "Canonical UUIDv7 Domain Event identifier."
    },
    "event_type": {
      "type": "string"
    },
    "event_schema_version": {
      "type": "integer",
      "const": 1
    },
    "workspace_id": {
      "type": "string",
      "format": "uuid",
      "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
      "description": "Canonical UUIDv7 Workspace identifier."
    },
    "command_id": {
      "type": "string",
      "format": "uuid",
      "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
      "description": "Canonical UUIDv7 Command Group identifier."
    },
    "occurred_at": {
      "type": "string",
      "format": "date-time"
    },
    "actor": {
      "oneOf": [
        {
          "type": "object",
          "required": [
            "kind",
            "provisioner_id"
          ],
          "properties": {
            "kind": {
              "const": "restricted-provisioner"
            },
            "provisioner_id": {
              "type": "string",
              "minLength": 1
            }
          },
          "additionalProperties": false
        },
        {
          "type": "object",
          "required": [
            "kind",
            "identity"
          ],
          "properties": {
            "kind": {
              "const": "external-identity"
            },
            "identity": {
              "type": "object",
              "required": [
                "provider",
                "subject",
                "email"
              ],
              "properties": {
                "provider": {
                  "const": "google"
                },
                "subject": {
                  "type": "string",
                  "minLength": 1
                },
                "email": {
                  "type": "string",
                  "format": "email"
                }
              },
              "additionalProperties": false
            }
          },
          "additionalProperties": false
        },
        {
          "type": "object",
          "required": [
            "kind",
            "user_account_id"
          ],
          "properties": {
            "kind": {
              "const": "user-account"
            },
            "user_account_id": {
              "type": "string",
              "format": "uuid",
              "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
            }
          },
          "additionalProperties": false
        }
      ]
    },
    "payload": {
      "type": "object"
    }
  },
  "additionalProperties": false
} as const

const EVENT_PAYLOAD_SCHEMAS: Readonly<Record<EventType, unknown>> = {
  "membership.activated": {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"membership.activated v1","type":"object","required":["membership_id","user_account_id"],"properties":{"membership_id":{"type":"string","format":"uuid","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"},"user_account_id":{"type":"string","format":"uuid","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"}},"additionalProperties":false},
  "membership.preauthorized": {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"membership.preauthorized v1","type":"object","required":["membership_id","email","role"],"properties":{"membership_id":{"type":"string","format":"uuid","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"},"email":{"type":"string","format":"email"},"role":{"enum":["admin","contributor"]}},"additionalProperties":false},
  "user-account.linked": {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"user-account.linked v1","type":"object","required":["user_account_id","identity"],"properties":{"user_account_id":{"type":"string","format":"uuid","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"},"identity":{"type":"object","required":["provider","subject","email"],"properties":{"provider":{"const":"google"},"subject":{"type":"string","minLength":1},"email":{"type":"string","format":"email"}},"additionalProperties":false}},"additionalProperties":false},
  "workspace.created": {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"workspace.created v1","type":"object","required":["workspace_id","name"],"properties":{"workspace_id":{"type":"string","format":"uuid","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"},"name":{"type":"string","minLength":1}},"additionalProperties":false},
}

/** Returns a structural Contract error, or undefined when the v1 Event is valid. */
export function validateGeneratedEvent(value: unknown): string | undefined {
  const envelopeError = validateSchema(value, EVENT_ENVELOPE_SCHEMA, '$')
  if (envelopeError) return envelopeError
  const event = value as { event_type: unknown; payload: unknown }
  if (typeof event.event_type !== 'string' || !(event.event_type in EVENT_TYPE_BY_NAME)) {
    return '$.event_type must name a supported Event Contract.'
  }
  return validateSchema(event.payload, EVENT_PAYLOAD_SCHEMAS[event.event_type as EventType], '$.payload')
}

function validateSchema(value: unknown, schema: unknown, path: string): string | undefined {
  if (!isRecord(schema)) return undefined
  if (Array.isArray(schema.oneOf)) {
    const matches = schema.oneOf.filter(option => validateSchema(value, option, path) === undefined)
    return matches.length === 1 ? undefined : `${path} must match exactly one Contract variant.`
  }
  if ('const' in schema && !sameJson(value, schema.const)) return `${path} must equal the Contract constant.`
  if (Array.isArray(schema.enum) && !schema.enum.some(option => sameJson(value, option))) return `${path} must be one of the Contract values.`
  if (schema.type === 'string') {
    if (typeof value !== 'string') return `${path} must be a string.`
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) return `${path} is shorter than the Contract minimum.`
    if (typeof schema.pattern === 'string' && !(new RegExp(schema.pattern).test(value))) return `${path} does not match the Contract pattern.`
    if (schema.format === 'date-time' && !isRfc3339DateTime(value)) return `${path} must be an RFC 3339 date-time.`
    if (schema.format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `${path} must be an email address.`
    return undefined
  }
  if (schema.type === 'integer') return Number.isInteger(value) ? undefined : `${path} must be an integer.`
  if (schema.type === 'number') return typeof value === 'number' && Number.isFinite(value) ? undefined : `${path} must be a number.`
  if (schema.type === 'boolean') return typeof value === 'boolean' ? undefined : `${path} must be a boolean.`
  if (schema.type === 'array') {
    if (!Array.isArray(value)) return `${path} must be an array.`
    return value.map((entry, index) => validateSchema(entry, schema.items, `${path}[${index}]`)).find(Boolean)
  }
  if (schema.type === 'object') {
    if (!isRecord(value)) return `${path} must be an object.`
    const properties = isRecord(schema.properties) ? schema.properties : {}
    if (Array.isArray(schema.required)) {
      for (const key of schema.required) if (typeof key === 'string' && !(key in value)) return `${path}.${key} is required.`
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) if (!(key in properties)) return `${path}.${key} is not allowed by the Contract.`
    }
    for (const [key, propertySchema] of Object.entries(properties)) {
      if (!(key in value)) continue
      const error = validateSchema(value[key], propertySchema, `${path}.${key}`)
      if (error) return error
    }
  }
  return undefined
}

function isRfc3339DateTime(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[Zz]|[+-]\d{2}:\d{2})$/.exec(value)
  if (!match) return false
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const second = Number(secondText)
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59) return false
  const offset = value.endsWith('Z') || value.endsWith('z') ? undefined : value.slice(-5).split(':').map(Number)
  if (offset && (offset[0] > 23 || offset[1] > 59)) return false
  const daysInMonth = month === 2
    ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28)
    : [4, 6, 9, 11].includes(month) ? 30 : 31
  return day >= 1 && day <= daysInMonth
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}
