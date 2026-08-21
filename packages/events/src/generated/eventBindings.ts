/*
 * GENERATED FILE — do not edit by hand.
 * Run `npm run generate:event-bindings` after changing these contract sources:
 * - schemas/workspace/band-deactivated.v1.yaml
 * - schemas/workspace/band-fields-amended.v1.yaml
 * - schemas/workspace/band-reactivated.v1.yaml
 * - schemas/workspace/band-received.v1.yaml
 * - schemas/workspace/bander-created.v1.yaml
 * - schemas/workspace/bander-deactivated.v1.yaml
 * - schemas/workspace/bander-fields-amended.v1.yaml
 * - schemas/workspace/bander-reactivated.v1.yaml
 * - schemas/workspace/banding-record-created.v1.yaml
 * - schemas/workspace/banding-record-created.v2.yaml
 * - schemas/workspace/banding-record-deactivated.v1.yaml
 * - schemas/workspace/banding-record-fields-amended.v1.yaml
 * - schemas/workspace/banding-record-fields-amended.v2.yaml
 * - schemas/workspace/banding-record-reactivated.v1.yaml
 * - schemas/workspace/event-envelope.v1.yaml
 * - schemas/workspace/event-envelope.v2.yaml
 * - schemas/workspace/membership-activated.v1.yaml
 * - schemas/workspace/membership-deactivated.v1.yaml
 * - schemas/workspace/membership-preauthorized.v1.yaml
 * - schemas/workspace/membership-reactivated.v1.yaml
 * - schemas/workspace/membership-role-changed.v1.yaml
 * - schemas/workspace/net-created.v1.yaml
 * - schemas/workspace/net-deactivated.v1.yaml
 * - schemas/workspace/net-fields-amended.v1.yaml
 * - schemas/workspace/net-reactivated.v1.yaml
 * - schemas/workspace/person-created.v1.yaml
 * - schemas/workspace/person-deactivated.v1.yaml
 * - schemas/workspace/person-fields-amended.v1.yaml
 * - schemas/workspace/person-reactivated.v1.yaml
 * - schemas/workspace/session-created.v1.yaml
 * - schemas/workspace/session-created.v2.yaml
 * - schemas/workspace/session-crew-member-added.v1.yaml
 * - schemas/workspace/session-crew-member-removed.v1.yaml
 * - schemas/workspace/session-deactivated.v1.yaml
 * - schemas/workspace/session-fields-amended.v1.yaml
 * - schemas/workspace/session-reactivated.v1.yaml
 * - schemas/workspace/station-created.v1.yaml
 * - schemas/workspace/station-deactivated.v1.yaml
 * - schemas/workspace/station-fields-amended.v1.yaml
 * - schemas/workspace/station-reactivated.v1.yaml
 * - schemas/workspace/user-account-linked.v1.yaml
 * - schemas/workspace/user-account-person-linked.v1.yaml
 * - schemas/workspace/user-account-person-unlinked.v1.yaml
 * - schemas/workspace/workspace-created.v1.yaml
 */

export type EventType = "band.deactivated" | "band.fields-amended" | "band.reactivated" | "band.received" | "bander.created" | "bander.deactivated" | "bander.fields-amended" | "bander.reactivated" | "banding-record.created" | "banding-record.deactivated" | "banding-record.fields-amended" | "banding-record.reactivated" | "membership.activated" | "membership.deactivated" | "membership.preauthorized" | "membership.reactivated" | "membership.role-changed" | "net.created" | "net.deactivated" | "net.fields-amended" | "net.reactivated" | "person.created" | "person.deactivated" | "person.fields-amended" | "person.reactivated" | "session.created" | "session-crew-member.added" | "session-crew-member.removed" | "session.deactivated" | "session.fields-amended" | "session.reactivated" | "station.created" | "station.deactivated" | "station.fields-amended" | "station.reactivated" | "user-account.linked" | "user-account.person-linked" | "user-account.person-unlinked" | "workspace.created"

export type EventPayloadByType = {
  "band.deactivated": { "band_id": string }
  "band.fields-amended": { "band_id": string; "fields": Record<string, unknown> }
  "band.reactivated": { "band_id": string }
  "band.received": { "band_id": string; "band_number": string; "fields"?: Record<string, unknown> }
  "bander.created": { "bander_id": string; "person_id": string; "fields"?: Record<string, unknown> }
  "bander.deactivated": { "bander_id": string }
  "bander.fields-amended": { "bander_id": string; "fields": Record<string, unknown> }
  "bander.reactivated": { "bander_id": string }
  "banding-record.created": { "record_id": string; "session_id": string; "fields": Record<string, unknown> }
  "banding-record.deactivated": { "record_id": string }
  "banding-record.fields-amended": { "record_id": string; "fields": Record<string, unknown> }
  "banding-record.reactivated": { "record_id": string }
  "membership.activated": { "membership_id": string; "user_account_id": string }
  "membership.deactivated": { "membership_id": string }
  "membership.preauthorized": { "membership_id": string; "email": string; "role": "admin" | "contributor" }
  "membership.reactivated": { "membership_id": string }
  "membership.role-changed": { "membership_id": string; "role": "admin" | "contributor" }
  "net.created": { "net_id": string; "station_id": string; "fields"?: Record<string, unknown> }
  "net.deactivated": { "net_id": string }
  "net.fields-amended": { "net_id": string; "fields": Record<string, unknown> }
  "net.reactivated": { "net_id": string }
  "person.created": { "person_id": string; "fields"?: Record<string, unknown> }
  "person.deactivated": { "person_id": string }
  "person.fields-amended": { "person_id": string; "fields": Record<string, unknown> }
  "person.reactivated": { "person_id": string }
  "session.created": { "session_id": string; "fields": Record<string, unknown> }
  "session-crew-member.added": { "session_id": string; "bander_id": string }
  "session-crew-member.removed": { "session_id": string; "bander_id": string }
  "session.deactivated": { "session_id": string }
  "session.fields-amended": { "session_id": string; "fields": Record<string, unknown> }
  "session.reactivated": { "session_id": string }
  "station.created": { "station_id": string; "fields"?: Record<string, unknown> }
  "station.deactivated": { "station_id": string }
  "station.fields-amended": { "station_id": string; "fields": Record<string, unknown> }
  "station.reactivated": { "station_id": string }
  "user-account.linked": { "user_account_id": string; "identity": { "provider": "google"; "subject": string; "email": string } }
  "user-account.person-linked": { "user_account_id": string; "person_id": string }
  "user-account.person-unlinked": { "user_account_id": string }
  "workspace.created": { "workspace_id": string; "name": string }
}

export type EventPayloadByTypeAndVersion = {
  "band.deactivated": { 1: { "band_id": string } }
  "band.fields-amended": { 1: { "band_id": string; "fields": Record<string, unknown> } }
  "band.reactivated": { 1: { "band_id": string } }
  "band.received": { 1: { "band_id": string; "band_number": string; "fields"?: Record<string, unknown> } }
  "bander.created": { 1: { "bander_id": string; "person_id": string; "fields"?: Record<string, unknown> } }
  "bander.deactivated": { 1: { "bander_id": string } }
  "bander.fields-amended": { 1: { "bander_id": string; "fields": Record<string, unknown> } }
  "bander.reactivated": { 1: { "bander_id": string } }
  "banding-record.created": { 1: { "record_id": string; "session_id": string; "band_number"?: string; "species_code"?: string; "age"?: string; "sex"?: string; "capture_time"?: string; "notes"?: string }; 2: { "record_id": string; "session_id": string; "fields": Record<string, unknown> } }
  "banding-record.deactivated": { 1: { "record_id": string } }
  "banding-record.fields-amended": { 1: { "record_id": string; "fields": { "band_number"?: string; "species_code"?: string; "age"?: string; "sex"?: string; "capture_time"?: string; "notes"?: string } }; 2: { "record_id": string; "fields": Record<string, unknown> } }
  "banding-record.reactivated": { 1: { "record_id": string } }
  "membership.activated": { 1: { "membership_id": string; "user_account_id": string } }
  "membership.deactivated": { 1: { "membership_id": string } }
  "membership.preauthorized": { 1: { "membership_id": string; "email": string; "role": "admin" | "contributor" } }
  "membership.reactivated": { 1: { "membership_id": string } }
  "membership.role-changed": { 1: { "membership_id": string; "role": "admin" | "contributor" } }
  "net.created": { 1: { "net_id": string; "station_id": string; "fields"?: Record<string, unknown> } }
  "net.deactivated": { 1: { "net_id": string } }
  "net.fields-amended": { 1: { "net_id": string; "fields": Record<string, unknown> } }
  "net.reactivated": { 1: { "net_id": string } }
  "person.created": { 1: { "person_id": string; "fields"?: Record<string, unknown> } }
  "person.deactivated": { 1: { "person_id": string } }
  "person.fields-amended": { 1: { "person_id": string; "fields": Record<string, unknown> } }
  "person.reactivated": { 1: { "person_id": string } }
  "session.created": { 1: { "session_id": string; "session_date"?: string; "location_name"?: string; "protocol"?: string; "notes"?: string }; 2: { "session_id": string; "fields": Record<string, unknown> } }
  "session-crew-member.added": { 1: { "session_id": string; "bander_id": string } }
  "session-crew-member.removed": { 1: { "session_id": string; "bander_id": string } }
  "session.deactivated": { 1: { "session_id": string } }
  "session.fields-amended": { 1: { "session_id": string; "fields": Record<string, unknown> } }
  "session.reactivated": { 1: { "session_id": string } }
  "station.created": { 1: { "station_id": string; "fields"?: Record<string, unknown> } }
  "station.deactivated": { 1: { "station_id": string } }
  "station.fields-amended": { 1: { "station_id": string; "fields": Record<string, unknown> } }
  "station.reactivated": { 1: { "station_id": string } }
  "user-account.linked": { 1: { "user_account_id": string; "identity": { "provider": "google"; "subject": string; "email": string } } }
  "user-account.person-linked": { 1: { "user_account_id": string; "person_id": string } }
  "user-account.person-unlinked": { 1: { "user_account_id": string } }
  "workspace.created": { 1: { "workspace_id": string; "name": string } }
}

export type EventSchemaVersionByType = {
  "band.deactivated": 1,
  "band.fields-amended": 1,
  "band.reactivated": 1,
  "band.received": 1,
  "bander.created": 1,
  "bander.deactivated": 1,
  "bander.fields-amended": 1,
  "bander.reactivated": 1,
  "banding-record.created": 2,
  "banding-record.deactivated": 1,
  "banding-record.fields-amended": 2,
  "banding-record.reactivated": 1,
  "membership.activated": 1,
  "membership.deactivated": 1,
  "membership.preauthorized": 1,
  "membership.reactivated": 1,
  "membership.role-changed": 1,
  "net.created": 1,
  "net.deactivated": 1,
  "net.fields-amended": 1,
  "net.reactivated": 1,
  "person.created": 1,
  "person.deactivated": 1,
  "person.fields-amended": 1,
  "person.reactivated": 1,
  "session.created": 2,
  "session-crew-member.added": 1,
  "session-crew-member.removed": 1,
  "session.deactivated": 1,
  "session.fields-amended": 1,
  "session.reactivated": 1,
  "station.created": 1,
  "station.deactivated": 1,
  "station.fields-amended": 1,
  "station.reactivated": 1,
  "user-account.linked": 1,
  "user-account.person-linked": 1,
  "user-account.person-unlinked": 1,
  "workspace.created": 1
}

type EventEnvelope = { "event_id": string; "event_type": string; "event_schema_version": number; "event_envelope_version": 2; "workspace_id": string; "command_id": string; "occurred_at": string; "hlc": { "physical_ms": number; "logical": number }; "actor": { "kind": "restricted-provisioner"; "provisioner_id": string } | { "kind": "external-identity"; "identity": { "provider": "google"; "subject": string; "email": string } } | { "kind": "user-account"; "user_account_id": string }; "payload": Record<string, unknown> }

type LegacyEventEnvelope = { "event_id": string; "event_type": string; "event_schema_version": 1; "workspace_id": string; "command_id": string; "occurred_at": string; "actor": { "kind": "restricted-provisioner"; "provisioner_id": string } | { "kind": "external-identity"; "identity": { "provider": "google"; "subject": string; "email": string } } | { "kind": "user-account"; "user_account_id": string }; "payload": Record<string, unknown> }

export type EventActor = EventEnvelope['actor']

export type DomainEvent<T extends EventType = EventType> = T extends EventType
  ? { [V in keyof EventPayloadByTypeAndVersion[T] & number]: Omit<EventEnvelope, 'event_type' | 'event_schema_version' | 'payload'> & { event_type: T; event_schema_version: V; payload: EventPayloadByTypeAndVersion[T][V] } }[keyof EventPayloadByTypeAndVersion[T] & number]
  : never

export type LegacyDomainEvent<T extends EventType = EventType> = T extends EventType
  ? Omit<LegacyEventEnvelope, 'event_type' | 'event_schema_version' | 'payload'> & { event_type: T; event_schema_version: 1; payload: EventPayloadByTypeAndVersion[T][1] }
  : never

export const EVENT_TYPES: readonly EventType[] = ["band.deactivated", "band.fields-amended", "band.reactivated", "band.received", "bander.created", "bander.deactivated", "bander.fields-amended", "bander.reactivated", "banding-record.created", "banding-record.deactivated", "banding-record.fields-amended", "banding-record.reactivated", "membership.activated", "membership.deactivated", "membership.preauthorized", "membership.reactivated", "membership.role-changed", "net.created", "net.deactivated", "net.fields-amended", "net.reactivated", "person.created", "person.deactivated", "person.fields-amended", "person.reactivated", "session.created", "session-crew-member.added", "session-crew-member.removed", "session.deactivated", "session.fields-amended", "session.reactivated", "station.created", "station.deactivated", "station.fields-amended", "station.reactivated", "user-account.linked", "user-account.person-linked", "user-account.person-unlinked", "workspace.created"]

export const CURRENT_EVENT_SCHEMA_VERSION: Readonly<EventSchemaVersionByType> = {
  "band.deactivated": 1,
  "band.fields-amended": 1,
  "band.reactivated": 1,
  "band.received": 1,
  "bander.created": 1,
  "bander.deactivated": 1,
  "bander.fields-amended": 1,
  "bander.reactivated": 1,
  "banding-record.created": 2,
  "banding-record.deactivated": 1,
  "banding-record.fields-amended": 2,
  "banding-record.reactivated": 1,
  "membership.activated": 1,
  "membership.deactivated": 1,
  "membership.preauthorized": 1,
  "membership.reactivated": 1,
  "membership.role-changed": 1,
  "net.created": 1,
  "net.deactivated": 1,
  "net.fields-amended": 1,
  "net.reactivated": 1,
  "person.created": 1,
  "person.deactivated": 1,
  "person.fields-amended": 1,
  "person.reactivated": 1,
  "session.created": 2,
  "session-crew-member.added": 1,
  "session-crew-member.removed": 1,
  "session.deactivated": 1,
  "session.fields-amended": 1,
  "session.reactivated": 1,
  "station.created": 1,
  "station.deactivated": 1,
  "station.fields-amended": 1,
  "station.reactivated": 1,
  "user-account.linked": 1,
  "user-account.person-linked": 1,
  "user-account.person-unlinked": 1,
  "workspace.created": 1
}

const EVENT_TYPE_BY_NAME: Readonly<Record<EventType, EventType>> = {
  "band.deactivated": "band.deactivated",
  "band.fields-amended": "band.fields-amended",
  "band.reactivated": "band.reactivated",
  "band.received": "band.received",
  "bander.created": "bander.created",
  "bander.deactivated": "bander.deactivated",
  "bander.fields-amended": "bander.fields-amended",
  "bander.reactivated": "bander.reactivated",
  "banding-record.created": "banding-record.created",
  "banding-record.deactivated": "banding-record.deactivated",
  "banding-record.fields-amended": "banding-record.fields-amended",
  "banding-record.reactivated": "banding-record.reactivated",
  "membership.activated": "membership.activated",
  "membership.deactivated": "membership.deactivated",
  "membership.preauthorized": "membership.preauthorized",
  "membership.reactivated": "membership.reactivated",
  "membership.role-changed": "membership.role-changed",
  "net.created": "net.created",
  "net.deactivated": "net.deactivated",
  "net.fields-amended": "net.fields-amended",
  "net.reactivated": "net.reactivated",
  "person.created": "person.created",
  "person.deactivated": "person.deactivated",
  "person.fields-amended": "person.fields-amended",
  "person.reactivated": "person.reactivated",
  "session.created": "session.created",
  "session-crew-member.added": "session-crew-member.added",
  "session-crew-member.removed": "session-crew-member.removed",
  "session.deactivated": "session.deactivated",
  "session.fields-amended": "session.fields-amended",
  "session.reactivated": "session.reactivated",
  "station.created": "station.created",
  "station.deactivated": "station.deactivated",
  "station.fields-amended": "station.fields-amended",
  "station.reactivated": "station.reactivated",
  "user-account.linked": "user-account.linked",
  "user-account.person-linked": "user-account.person-linked",
  "user-account.person-unlinked": "user-account.person-unlinked",
  "workspace.created": "workspace.created",
}

const EVENT_ENVELOPE_SCHEMA = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "BirdNerd Domain Event envelope v2",
  "type": "object",
  "required": [
    "event_id",
    "event_type",
    "event_schema_version",
    "event_envelope_version",
    "workspace_id",
    "command_id",
    "occurred_at",
    "hlc",
    "actor",
    "payload"
  ],
  "properties": {
    "event_id": {
      "type": "string",
      "format": "uuid",
      "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
    },
    "event_type": {
      "type": "string"
    },
    "event_schema_version": {
      "type": "integer",
      "minimum": 1
    },
    "event_envelope_version": {
      "type": "integer",
      "const": 2
    },
    "workspace_id": {
      "type": "string",
      "format": "uuid",
      "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
    },
    "command_id": {
      "type": "string",
      "format": "uuid",
      "pattern": "^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
    },
    "occurred_at": {
      "type": "string",
      "format": "date-time"
    },
    "hlc": {
      "type": "object",
      "required": [
        "physical_ms",
        "logical"
      ],
      "properties": {
        "physical_ms": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        },
        "logical": {
          "type": "integer",
          "minimum": 0,
          "maximum": 9007199254740991
        }
      },
      "additionalProperties": false
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

const LEGACY_EVENT_ENVELOPE_SCHEMA = {
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

const EVENT_PAYLOAD_SCHEMAS: Readonly<Record<EventType, Readonly<Record<number, unknown>>>> = {
  "band.deactivated": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"band.deactivated v1","type":"object","required":["band_id"],"properties":{"band_id":{"type":"string"}},"additionalProperties":false} },
  "band.fields-amended": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"band.fields-amended v1","type":"object","required":["band_id","fields"],"properties":{"band_id":{"type":"string"},"fields":{"type":"object","additionalProperties":true}},"additionalProperties":false} },
  "band.reactivated": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"band.reactivated v1","type":"object","required":["band_id"],"properties":{"band_id":{"type":"string"}},"additionalProperties":false} },
  "band.received": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"band.received v1","type":"object","required":["band_id","band_number"],"properties":{"band_id":{"type":"string"},"band_number":{"type":"string"},"fields":{"type":"object","additionalProperties":true}},"additionalProperties":false} },
  "bander.created": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"bander.created v1","type":"object","required":["bander_id","person_id"],"properties":{"bander_id":{"type":"string"},"person_id":{"type":"string"},"fields":{"type":"object","additionalProperties":true}},"additionalProperties":false} },
  "bander.deactivated": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"bander.deactivated v1","type":"object","required":["bander_id"],"properties":{"bander_id":{"type":"string"}},"additionalProperties":false} },
  "bander.fields-amended": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"bander.fields-amended v1","type":"object","required":["bander_id","fields"],"properties":{"bander_id":{"type":"string"},"fields":{"type":"object","additionalProperties":true}},"additionalProperties":false} },
  "bander.reactivated": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"bander.reactivated v1","type":"object","required":["bander_id"],"properties":{"bander_id":{"type":"string"}},"additionalProperties":false} },
  "banding-record.created": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"banding-record.created v1","type":"object","required":["record_id","session_id"],"properties":{"record_id":{"type":"string","format":"uuid","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"},"session_id":{"type":"string","format":"uuid","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"},"band_number":{"type":"string"},"species_code":{"type":"string"},"age":{"type":"string"},"sex":{"type":"string"},"capture_time":{"type":"string"},"notes":{"type":"string"}},"additionalProperties":false}, 2: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"banding-record.created v2","type":"object","required":["record_id","session_id","fields"],"properties":{"record_id":{"type":"string","format":"uuid","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"},"session_id":{"type":"string","format":"uuid","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"},"fields":{"type":"object","additionalProperties":true}},"additionalProperties":false} },
  "banding-record.deactivated": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"banding-record.deactivated v1","type":"object","required":["record_id"],"properties":{"record_id":{"type":"string"}},"additionalProperties":false} },
  "banding-record.fields-amended": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"banding-record.fields-amended v1","type":"object","required":["record_id","fields"],"properties":{"record_id":{"type":"string","format":"uuid","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"},"fields":{"type":"object","properties":{"band_number":{"type":"string"},"species_code":{"type":"string"},"age":{"type":"string"},"sex":{"type":"string"},"capture_time":{"type":"string"},"notes":{"type":"string"}},"additionalProperties":false}},"additionalProperties":false}, 2: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"banding-record.fields-amended v2","type":"object","required":["record_id","fields"],"properties":{"record_id":{"type":"string","format":"uuid","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"},"fields":{"type":"object","additionalProperties":true}},"additionalProperties":false} },
  "banding-record.reactivated": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"banding-record.reactivated v1","type":"object","required":["record_id"],"properties":{"record_id":{"type":"string"}},"additionalProperties":false} },
  "membership.activated": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"membership.activated v1","type":"object","required":["membership_id","user_account_id"],"properties":{"membership_id":{"type":"string","format":"uuid","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"},"user_account_id":{"type":"string","format":"uuid","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"}},"additionalProperties":false} },
  "membership.deactivated": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"membership.deactivated v1","type":"object","required":["membership_id"],"properties":{"membership_id":{"type":"string"}},"additionalProperties":false} },
  "membership.preauthorized": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"membership.preauthorized v1","type":"object","required":["membership_id","email","role"],"properties":{"membership_id":{"type":"string","format":"uuid","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"},"email":{"type":"string","format":"email"},"role":{"enum":["admin","contributor"]}},"additionalProperties":false} },
  "membership.reactivated": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"membership.reactivated v1","type":"object","required":["membership_id"],"properties":{"membership_id":{"type":"string"}},"additionalProperties":false} },
  "membership.role-changed": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"membership.role-changed v1","type":"object","required":["membership_id","role"],"properties":{"membership_id":{"type":"string"},"role":{"enum":["admin","contributor"]}},"additionalProperties":false} },
  "net.created": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"net.created v1","type":"object","required":["net_id","station_id"],"properties":{"net_id":{"type":"string"},"station_id":{"type":"string"},"fields":{"type":"object","additionalProperties":true}},"additionalProperties":false} },
  "net.deactivated": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"net.deactivated v1","type":"object","required":["net_id"],"properties":{"net_id":{"type":"string"}},"additionalProperties":false} },
  "net.fields-amended": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"net.fields-amended v1","type":"object","required":["net_id","fields"],"properties":{"net_id":{"type":"string"},"fields":{"type":"object","additionalProperties":true}},"additionalProperties":false} },
  "net.reactivated": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"net.reactivated v1","type":"object","required":["net_id"],"properties":{"net_id":{"type":"string"}},"additionalProperties":false} },
  "person.created": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"person.created v1","type":"object","required":["person_id"],"properties":{"person_id":{"type":"string"},"fields":{"type":"object","additionalProperties":true}},"additionalProperties":false} },
  "person.deactivated": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"person.deactivated v1","type":"object","required":["person_id"],"properties":{"person_id":{"type":"string"}},"additionalProperties":false} },
  "person.fields-amended": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"person.fields-amended v1","type":"object","required":["person_id","fields"],"properties":{"person_id":{"type":"string"},"fields":{"type":"object","additionalProperties":true}},"additionalProperties":false} },
  "person.reactivated": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"person.reactivated v1","type":"object","required":["person_id"],"properties":{"person_id":{"type":"string"}},"additionalProperties":false} },
  "session.created": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"session.created v1","type":"object","required":["session_id"],"properties":{"session_id":{"type":"string","format":"uuid","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"},"session_date":{"type":"string"},"location_name":{"type":"string"},"protocol":{"type":"string"},"notes":{"type":"string"}},"additionalProperties":false}, 2: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"session.created v2","type":"object","required":["session_id","fields"],"properties":{"session_id":{"type":"string","format":"uuid","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"},"fields":{"type":"object","additionalProperties":true}},"additionalProperties":false} },
  "session-crew-member.added": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"session-crew-member.added v1","type":"object","required":["session_id","bander_id"],"properties":{"session_id":{"type":"string"},"bander_id":{"type":"string"}},"additionalProperties":false} },
  "session-crew-member.removed": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"session-crew-member.removed v1","type":"object","required":["session_id","bander_id"],"properties":{"session_id":{"type":"string"},"bander_id":{"type":"string"}},"additionalProperties":false} },
  "session.deactivated": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"session.deactivated v1","type":"object","required":["session_id"],"properties":{"session_id":{"type":"string"}},"additionalProperties":false} },
  "session.fields-amended": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"session.fields-amended v1","type":"object","required":["session_id","fields"],"properties":{"session_id":{"type":"string"},"fields":{"type":"object","additionalProperties":true}},"additionalProperties":false} },
  "session.reactivated": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"session.reactivated v1","type":"object","required":["session_id"],"properties":{"session_id":{"type":"string"}},"additionalProperties":false} },
  "station.created": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"station.created v1","type":"object","required":["station_id"],"properties":{"station_id":{"type":"string","format":"uuid","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"},"fields":{"type":"object","additionalProperties":true}},"additionalProperties":false} },
  "station.deactivated": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"station.deactivated v1","type":"object","required":["station_id"],"properties":{"station_id":{"type":"string"}},"additionalProperties":false} },
  "station.fields-amended": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"station.fields-amended v1","type":"object","required":["station_id","fields"],"properties":{"station_id":{"type":"string"},"fields":{"type":"object","additionalProperties":true}},"additionalProperties":false} },
  "station.reactivated": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"station.reactivated v1","type":"object","required":["station_id"],"properties":{"station_id":{"type":"string"}},"additionalProperties":false} },
  "user-account.linked": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"user-account.linked v1","type":"object","required":["user_account_id","identity"],"properties":{"user_account_id":{"type":"string","format":"uuid","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"},"identity":{"type":"object","required":["provider","subject","email"],"properties":{"provider":{"const":"google"},"subject":{"type":"string","minLength":1},"email":{"type":"string","format":"email"}},"additionalProperties":false}},"additionalProperties":false} },
  "user-account.person-linked": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"user-account.person-linked v1","type":"object","required":["user_account_id","person_id"],"properties":{"user_account_id":{"type":"string"},"person_id":{"type":"string"}},"additionalProperties":false} },
  "user-account.person-unlinked": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"user-account.person-unlinked v1","type":"object","required":["user_account_id"],"properties":{"user_account_id":{"type":"string"}},"additionalProperties":false} },
  "workspace.created": { 1: {"$schema":"https://json-schema.org/draft/2020-12/schema","title":"workspace.created v1","type":"object","required":["workspace_id","name"],"properties":{"workspace_id":{"type":"string","format":"uuid","pattern":"^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"},"name":{"type":"string","minLength":1}},"additionalProperties":false} },
}

/** Returns a structural Contract error, or undefined for a valid v1 or v2 Event. */
export function validateGeneratedEvent(value: unknown): string | undefined {
  const envelopeSchema = isRecord(value) && value.event_envelope_version === 2
    ? EVENT_ENVELOPE_SCHEMA
    : LEGACY_EVENT_ENVELOPE_SCHEMA
  const envelopeError = validateSchema(value, envelopeSchema, '$')
  if (envelopeError) return envelopeError
  const event = value as { event_type: unknown; payload: unknown }
  if (typeof event.event_type !== 'string' || !(event.event_type in EVENT_TYPE_BY_NAME)) {
    return '$.event_type must name a supported Event Contract.'
  }
  const schemaVersion = (value as { event_schema_version?: unknown }).event_schema_version
  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 1) return '$.event_schema_version must be a positive integer.'
  const payloadSchema = EVENT_PAYLOAD_SCHEMAS[event.event_type as EventType][schemaVersion]
  if (!payloadSchema) return '$.event_schema_version is not supported for this Event type.'
  return validateSchema(event.payload, payloadSchema, '$.payload')
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
  if (schema.type === 'integer') {
    if (!Number.isInteger(value)) return `${path} must be an integer.`
    if (typeof schema.minimum === 'number' && (value as number) < schema.minimum) return `${path} is below the Contract minimum.`
    if (typeof schema.maximum === 'number' && (value as number) > schema.maximum) return `${path} exceeds the Contract maximum.`
    return undefined
  }
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
  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 60) return false
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
