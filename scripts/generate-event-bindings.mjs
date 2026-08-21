#!/usr/bin/env node
/**
 * Generates the narrow TypeScript surface for the portable Workspace Event
 * Contracts. The source contracts stay YAML/JSON Schema; generated bindings
 * give TypeScript consumers one discriminated event union and an equivalent
 * runtime structural validator without making JSON Schema a runtime dependency.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDocument } from 'yaml'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(scriptDirectory, '..')
const contractDirectory = resolve(repositoryRoot, 'schemas/workspace')
const outputPath = resolve(repositoryRoot, 'packages/events/src/generated/eventBindings.ts')
const checkOnly = process.argv.slice(2).includes('--check')
const supportedKeywords = new Set([
  '$schema', 'title', 'description', 'type', 'required', 'properties', 'additionalProperties',
  'enum', 'const', 'format', 'minLength', 'minimum', 'maximum', 'pattern', 'items', 'oneOf',
])

const files = (await readdir(contractDirectory))
  .filter((file) => file.endsWith('.yaml'))
  .sort()

const contracts = await Promise.all(files.map(async (file) => {
  const path = resolve(contractDirectory, file)
  const source = await readFile(path, 'utf8')
  const document = parseDocument(source, { prettyErrors: true })
  if (document.errors.length > 0) throw new Error(`${relative(repositoryRoot, path)}: ${document.errors[0].message}`)
  const schema = document.toJSON()
  assertSupportedSchema(schema, relative(repositoryRoot, path))
  return { file, schema }
}))

const legacyEnvelope = contracts.find(({ file }) => file === 'event-envelope.v1.yaml')
const envelope = contracts.find(({ file }) => file === 'event-envelope.v2.yaml')
if (!legacyEnvelope || !envelope) throw new Error('Both v1 and v2 Event envelope contracts are required.')
const payloadContracts = contracts
  .filter(({ file }) => !file.startsWith('event-envelope.'))
  .map(({ file, schema }) => ({ file, schema, ...eventContractFromTitle(schema.title, file) }))

const duplicateContract = payloadContracts.find((contract, index) => payloadContracts.findIndex((other) => other.eventType === contract.eventType && other.eventSchemaVersion === contract.eventSchemaVersion) !== index)
if (duplicateContract) throw new Error(`Duplicate Event Contract type/version: ${duplicateContract.eventType} v${duplicateContract.eventSchemaVersion}`)

const generated = render({ legacyEnvelope: legacyEnvelope.schema, envelope: envelope.schema, payloadContracts, files })
if (checkOnly) {
  const committed = await readFile(outputPath, 'utf8')
  if (committed !== generated) {
    console.error('Generated Event Contract bindings are stale. Run npm run generate:event-bindings.')
    process.exitCode = 1
  }
} else {
  await writeFile(outputPath, generated)
}

function eventContractFromTitle(title, file) {
  const match = typeof title === 'string' && /^(.*) v([1-9][0-9]*)$/.exec(title)
  if (!match) {
    throw new Error(`${file}: title must be an Event Type followed by " v<positive integer>".`)
  }
  const [, eventType, versionText] = match
  if (!/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/.test(eventType)) {
    throw new Error(`${file}: "${eventType}" is not a dotted lower-case Event Type.`)
  }
  return { eventType, eventSchemaVersion: Number(versionText) }
}

function assertSupportedSchema(schema, source) {
  walk(schema, '$')

  function walk(value, path) {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => walk(entry, `${path}[${index}]`))
      return
    }
    if (!isRecord(value)) return
    for (const [key, child] of Object.entries(value)) {
      if (!supportedKeywords.has(key)) throw new Error(`${source}: ${path}.${key} is outside the supported Event Contract subset.`)
      if (key === 'properties') {
        if (!isRecord(child)) throw new Error(`${source}: ${path}.properties must be an object.`)
        Object.entries(child).forEach(([property, propertySchema]) => walk(propertySchema, `${path}.properties.${property}`))
      } else if (key === 'oneOf') {
        if (!Array.isArray(child) || child.length === 0) throw new Error(`${source}: ${path}.oneOf must be a non-empty array.`)
        child.forEach((option, index) => walk(option, `${path}.oneOf[${index}]`))
      } else if (key === 'items') {
        walk(child, `${path}.items`)
      }
    }
  }
}

function render({ legacyEnvelope, envelope, payloadContracts, files }) {
  const byType = new Map()
  for (const contract of payloadContracts) byType.set(contract.eventType, [...(byType.get(contract.eventType) ?? []), contract].sort((left, right) => left.eventSchemaVersion - right.eventSchemaVersion))
  const eventTypes = [...byType.keys()].map(JSON.stringify).join(' | ')
  const payloadTypes = [...byType.entries()].map(([eventType, versions]) => `${JSON.stringify(eventType)}: ${typeFor(versions.at(-1).schema)}`).join('\n  ')
  const payloadTypesByVersion = [...byType.entries()].map(([eventType, versions]) => `${JSON.stringify(eventType)}: { ${versions.map(({ eventSchemaVersion, schema }) => `${eventSchemaVersion}: ${typeFor(schema)}`).join('; ')} }`).join('\n  ')
  const currentVersions = [...byType.entries()].map(([eventType, versions]) => `${JSON.stringify(eventType)}: ${versions.at(-1).eventSchemaVersion}`).join(',\n  ')
  const eventCases = [...byType.keys()].map((eventType) => (
    `  ${JSON.stringify(eventType)}: ${JSON.stringify(eventType)},`
  )).join('\n')
  const payloadSchemas = [...byType.entries()].map(([eventType, versions]) => (
    `  ${JSON.stringify(eventType)}: { ${versions.map(({ eventSchemaVersion, schema }) => `${eventSchemaVersion}: ${JSON.stringify(schema)}`).join(', ')} },`
  )).join('\n')
  const sourceFiles = files.map((file) => ` * - schemas/workspace/${file}`).join('\n')
  const envelopeFields = typeFor(envelope)
  const legacyEnvelopeFields = typeFor(legacyEnvelope)

  return `/*\n * GENERATED FILE — do not edit by hand.\n * Run \`npm run generate:event-bindings\` after changing these contract sources:\n${sourceFiles}\n */\n\n` +
`export type EventType = ${eventTypes}\n\n` +
`export type EventPayloadByType = {\n  ${payloadTypes}\n}\n\n` +
`export type EventPayloadByTypeAndVersion = {\n  ${payloadTypesByVersion}\n}\n\n` +
`export type EventSchemaVersionByType = {\n  ${currentVersions}\n}\n\n` +
`type EventEnvelope = ${envelopeFields}\n\n` +
`type LegacyEventEnvelope = ${legacyEnvelopeFields}\n\n` +
`export type EventActor = EventEnvelope['actor']\n\n` +
`export type DomainEvent<T extends EventType = EventType> = T extends EventType\n` +
`  ? { [V in keyof EventPayloadByTypeAndVersion[T] & number]: Omit<EventEnvelope, 'event_type' | 'event_schema_version' | 'payload'> & { event_type: T; event_schema_version: V; payload: EventPayloadByTypeAndVersion[T][V] } }[keyof EventPayloadByTypeAndVersion[T] & number]\n` +
`  : never\n\n` +
`export type LegacyDomainEvent<T extends EventType = EventType> = T extends EventType\n` +
`  ? Omit<LegacyEventEnvelope, 'event_type' | 'event_schema_version' | 'payload'> & { event_type: T; event_schema_version: 1; payload: EventPayloadByTypeAndVersion[T][1] }\n` +
`  : never\n\n` +
`export const EVENT_TYPES: readonly EventType[] = [${[...byType.keys()].map(JSON.stringify).join(', ')}]\n\n` +
`export const CURRENT_EVENT_SCHEMA_VERSION: Readonly<EventSchemaVersionByType> = {\n  ${currentVersions}\n}\n\n` +
`const EVENT_TYPE_BY_NAME: Readonly<Record<EventType, EventType>> = {\n${eventCases}\n}\n\n` +
`const EVENT_ENVELOPE_SCHEMA = ${JSON.stringify(envelope, null, 2)} as const\n\n` +
`const LEGACY_EVENT_ENVELOPE_SCHEMA = ${JSON.stringify(legacyEnvelope, null, 2)} as const\n\n` +
`const EVENT_PAYLOAD_SCHEMAS: Readonly<Record<EventType, Readonly<Record<number, unknown>>>> = {\n${payloadSchemas}\n}\n\n` +
`/** Returns a structural Contract error, or undefined for a valid v1 or v2 Event. */\n` +
`export function validateGeneratedEvent(value: unknown): string | undefined {\n` +
`  const envelopeSchema = isRecord(value) && value.event_envelope_version === 2\n` +
`    ? EVENT_ENVELOPE_SCHEMA\n` +
`    : LEGACY_EVENT_ENVELOPE_SCHEMA\n` +
`  const envelopeError = validateSchema(value, envelopeSchema, '$')\n` +
`  if (envelopeError) return envelopeError\n` +
`  const event = value as { event_type: unknown; payload: unknown }\n` +
`  if (typeof event.event_type !== 'string' || !(event.event_type in EVENT_TYPE_BY_NAME)) {\n` +
`    return '$.event_type must name a supported Event Contract.'\n` +
`  }\n` +
`  const schemaVersion = (value as { event_schema_version?: unknown }).event_schema_version\n` +
`  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 1) return '$.event_schema_version must be a positive integer.'\n` +
`  const payloadSchema = EVENT_PAYLOAD_SCHEMAS[event.event_type as EventType][schemaVersion]\n` +
`  if (!payloadSchema) return '$.event_schema_version is not supported for this Event type.'\n` +
`  return validateSchema(event.payload, payloadSchema, '$.payload')\n` +
`}\n\n` +
`function validateSchema(value: unknown, schema: unknown, path: string): string | undefined {\n` +
`  if (!isRecord(schema)) return undefined\n` +
`  if (Array.isArray(schema.oneOf)) {\n` +
`    const matches = schema.oneOf.filter(option => validateSchema(value, option, path) === undefined)\n` +
`    return matches.length === 1 ? undefined : \`${'${path}'} must match exactly one Contract variant.\`\n` +
`  }\n` +
`  if ('const' in schema && !sameJson(value, schema.const)) return \`${'${path}'} must equal the Contract constant.\`\n` +
`  if (Array.isArray(schema.enum) && !schema.enum.some(option => sameJson(value, option))) return \`${'${path}'} must be one of the Contract values.\`\n` +
`  if (schema.type === 'string') {\n` +
`    if (typeof value !== 'string') return \`${'${path}'} must be a string.\`\n` +
`    if (typeof schema.minLength === 'number' && value.length < schema.minLength) return \`${'${path}'} is shorter than the Contract minimum.\`\n` +
`    if (typeof schema.pattern === 'string' && !(new RegExp(schema.pattern).test(value))) return \`${'${path}'} does not match the Contract pattern.\`\n` +
`    if (schema.format === 'date-time' && !isRfc3339DateTime(value)) return \`${'${path}'} must be an RFC 3339 date-time.\`\n` +
`    if (schema.format === 'email' && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value)) return \`${'${path}'} must be an email address.\`\n` +
`    return undefined\n` +
`  }\n` +
`  if (schema.type === 'integer') {\n` +
`    if (!Number.isInteger(value)) return \`${'${path}'} must be an integer.\`\n` +
`    if (typeof schema.minimum === 'number' && (value as number) < schema.minimum) return \`${'${path}'} is below the Contract minimum.\`\n` +
`    if (typeof schema.maximum === 'number' && (value as number) > schema.maximum) return \`${'${path}'} exceeds the Contract maximum.\`\n` +
`    return undefined\n` +
`  }\n` +
`  if (schema.type === 'number') return typeof value === 'number' && Number.isFinite(value) ? undefined : \`${'${path}'} must be a number.\`\n` +
`  if (schema.type === 'boolean') return typeof value === 'boolean' ? undefined : \`${'${path}'} must be a boolean.\`\n` +
`  if (schema.type === 'array') {\n` +
`    if (!Array.isArray(value)) return \`${'${path}'} must be an array.\`\n` +
`    return value.map((entry, index) => validateSchema(entry, schema.items, \`${'${path}'}[${'${index}'}]\`)).find(Boolean)\n` +
`  }\n` +
`  if (schema.type === 'object') {\n` +
`    if (!isRecord(value)) return \`${'${path}'} must be an object.\`\n` +
`    const properties = isRecord(schema.properties) ? schema.properties : {}\n` +
`    if (Array.isArray(schema.required)) {\n` +
`      for (const key of schema.required) if (typeof key === 'string' && !(key in value)) return \`${'${path}'}.${'${key}'} is required.\`\n` +
`    }\n` +
`    if (schema.additionalProperties === false) {\n` +
`      for (const key of Object.keys(value)) if (!(key in properties)) return \`${'${path}'}.${'${key}'} is not allowed by the Contract.\`\n` +
`    }\n` +
`    for (const [key, propertySchema] of Object.entries(properties)) {\n` +
`      if (!(key in value)) continue\n` +
`      const error = validateSchema(value[key], propertySchema, \`${'${path}'}.${'${key}'}\`)\n` +
`      if (error) return error\n` +
`    }\n` +
`  }\n` +
`  return undefined\n` +
`}\n\n` +
`function isRfc3339DateTime(value: string): boolean {\n` +
`  const match = /^(\\d{4})-(\\d{2})-(\\d{2})[Tt](\\d{2}):(\\d{2}):(\\d{2})(?:\\.\\d+)?(?:[Zz]|[+-]\\d{2}:\\d{2})$/.exec(value)\n` +
`  if (!match) return false\n` +
`  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match\n` +
`  const year = Number(yearText)\n` +
`  const month = Number(monthText)\n` +
`  const day = Number(dayText)\n` +
`  const hour = Number(hourText)\n` +
`  const minute = Number(minuteText)\n` +
`  const second = Number(secondText)\n` +
`  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 60) return false\n` +
`  const offset = value.endsWith('Z') || value.endsWith('z') ? undefined : value.slice(-5).split(':').map(Number)\n` +
`  if (offset && (offset[0] > 23 || offset[1] > 59)) return false\n` +
`  const daysInMonth = month === 2\n` +
`    ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28)\n` +
`    : [4, 6, 9, 11].includes(month) ? 30 : 31\n` +
`  return day >= 1 && day <= daysInMonth\n` +
`}\n\n` +
`function isRecord(value: unknown): value is Record<string, unknown> {\n  return typeof value === 'object' && value !== null && !Array.isArray(value)\n}\n\n` +
`function sameJson(left: unknown, right: unknown): boolean {\n  return JSON.stringify(left) === JSON.stringify(right)\n}\n`
}

function typeFor(schema) {
  if (!isRecord(schema)) return 'unknown'
  if ('const' in schema) return literalType(schema.const)
  if (Array.isArray(schema.enum)) return schema.enum.map(literalType).join(' | ')
  if (Array.isArray(schema.oneOf)) return schema.oneOf.map(typeFor).join(' | ')
  if (schema.type === 'string') return 'string'
  if (schema.type === 'integer' || schema.type === 'number') return 'number'
  if (schema.type === 'boolean') return 'boolean'
  if (schema.type === 'array') return `ReadonlyArray<${typeFor(schema.items)}>`
  if (schema.type === 'object') {
    const required = new Set(Array.isArray(schema.required) ? schema.required : [])
    const properties = isRecord(schema.properties) ? Object.entries(schema.properties) : []
    const members = properties.map(([key, property]) => `${JSON.stringify(key)}${required.has(key) ? '' : '?'}: ${typeFor(property)}`)
    return members.length === 0 ? 'Record<string, unknown>' : `{ ${members.join('; ')} }`
  }
  return 'unknown'
}

function literalType(value) {
  return typeof value === 'string' ? JSON.stringify(value) : String(value)
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
