#!/usr/bin/env node
/**
 * Guard the Supabase Event validator against drifting from the portable YAML
 * Contracts. The fingerprint covers the full current envelope and payload
 * catalog; structural checks also compare the SQL exact-key lists directly.
 */
import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDocument } from 'yaml'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const contractDirectory = resolve(repositoryRoot, 'schemas/workspace')
const migrationDirectory = resolve(repositoryRoot, 'supabase/migrations')
const contractFiles = (await readdir(contractDirectory)).filter(file => file.endsWith('.yaml')).sort()
const contracts = await Promise.all(contractFiles.map(async file => {
  const document = parseDocument(await readFile(resolve(contractDirectory, file), 'utf8'), { prettyErrors: true })
  if (document.errors.length > 0) throw document.errors[0]
  return { file, schema: document.toJSON() }
}))
const envelope = contracts.find(contract => contract.file === 'event-envelope.v2.yaml')?.schema
if (!envelope) throw new Error('The current v2 Event envelope Contract is missing.')
const payloads = contracts
  .filter(contract => !contract.file.startsWith('event-envelope.'))
  .map(contract => {
    const match = /^(.*) v([1-9][0-9]*)$/.exec(contract.schema.title ?? '')
    if (!match) throw new Error(`${contract.file}: Event Contract title must end in a positive version.`)
    return { eventType: match[1], eventSchemaVersion: Number(match[2]), schema: contract.schema }
  })
  .sort((left, right) => left.eventType.localeCompare(right.eventType) || left.eventSchemaVersion - right.eventSchemaVersion)
const payloadsByType = new Map()
for (const payload of payloads) payloadsByType.set(payload.eventType, [...(payloadsByType.get(payload.eventType) ?? []), payload])
const fingerprint = createHash('sha256')
  .update(JSON.stringify(canonical({ envelope, payloads: Object.fromEntries([...payloadsByType.entries()].map(([eventType, versions]) => [eventType, Object.fromEntries(versions.map(item => [item.eventSchemaVersion, item.schema]))])) })))
  .digest('hex')

if (process.argv.includes('--print-fingerprint')) {
  console.log(fingerprint)
  process.exit(0)
}

// The Event Contract is introduced by the Phase 30/31 catalog migrations and
// may be expanded by later additive admission migrations. Concatenating the
// ordered history means the last validator/function definition and fingerprint
// are the deployed current contract, without rewriting historical migrations.
const migrationFiles = (await readdir(migrationDirectory)).filter(file => file.endsWith('.sql')).sort()
if (!migrationFiles.some(file => /_phase_30_event_exchange\.sql$/.test(file)) || !migrationFiles.some(file => /_phase_31_operational_catalog\.sql$/.test(file))) {
  throw new Error('The Phase 30 and Phase 31 Event-exchange migrations are required.')
}
const sql = (await Promise.all(migrationFiles.map(file => readFile(resolve(migrationDirectory, file), 'utf8')))).join('\n')
const errors = []
const marker = [...sql.matchAll(/event-contract-sha256:\s*([0-9a-f]{64})/g)].at(-1)?.[1]
if (marker !== fingerprint) errors.push(`SQL Event Contract fingerprint is stale (expected ${fingerprint}).`)

checkExactKeys(sql, "event", envelope, 'Event envelope')
checkExactKeys(sql, "event -> 'hlc'", envelope.properties.hlc, 'Event HLC')

const sqlEventTypes = [...new Set([...sql.matchAll(/(?:if|elsif) event_type = '([^']+)' then/g)].map(match => match[1]))].sort()
compareKeys('SQL Event Type branches', sqlEventTypes, [...payloadsByType.keys()])

for (const [eventType, versions] of payloadsByType) {
  const branch = eventTypeBranch(sql, eventType)
  if (!branch) {
    errors.push(`SQL validator has no branch for ${eventType}.`)
    continue
  }
  if (versions.length > 1 && !branch.includes("event ->> 'event_schema_version' = '1'")) {
    errors.push(`SQL validator has no explicit per-version branch for ${eventType}.`)
  }
  const schema = versions[0].schema
  checkExactKeys(branch, 'payload', schema, `${eventType} payload`)
  for (const [property, propertySchema] of Object.entries(schema.properties ?? {})) {
    if (propertySchema.type !== 'object') continue
    if (propertySchema.additionalProperties !== false) continue
    if (property === 'identity' && branch.includes("payload -> 'identity' <> actor -> 'identity'")) continue
    checkExactKeys(branch, `payload -> '${property}'`, propertySchema, `${eventType}.${property}`)
  }
}

if (errors.length > 0) {
  console.error(`Supabase Event validator is out of sync with the YAML Contracts:\n- ${errors.join('\n- ')}`)
  process.exitCode = 1
}

function checkExactKeys(source, subject, schema, label) {
  // Named-field validators centralize the same exact-key/type policy for the
  // operational form maps; their complete source Contract is still covered by
  // the migration fingerprint above.
  if (subject.startsWith("payload -> '") && /valid_(station|net|person|bander|band|session|banding_record)_fields\(/.test(source)) return
  const subjectPattern = escapeRegExp(subject)
  const fallbackSubject = subject.startsWith("payload -> '") ? subject.slice("payload -> '".length, -1) : subject
  const match = new RegExp(`has_exact_keys\\(\\s*${subjectPattern}\\s*,\\s*(array\\[[^\\]]*\\]|'\\{\\}')(?:\\s*,\\s*(array\\[[^\\]]*\\]|'\\{\\}'))?\\s*\\)`, 's').exec(source)
    ?? new RegExp(`has_exact_keys\\(\\s*${escapeRegExp(fallbackSubject)}\\s*,\\s*(array\\[[^\\]]*\\]|'\\{\\}')(?:\\s*,\\s*(array\\[[^\\]]*\\]|'\\{\\}'))?\\s*\\)`, 's').exec(source)
  if (!match) {
    errors.push(`${label} has no checkable has_exact_keys call.`)
    return
  }
  const properties = Object.keys(schema.properties ?? {})
  const required = schema.required ?? []
  const optional = properties.filter(property => !required.includes(property))
  compareKeys(`${label} required keys`, sqlArray(match[1]), required)
  compareKeys(`${label} optional keys`, sqlArray(match[2]), optional)
}

function eventTypeBranch(source, eventType) {
  const matches = [...source.matchAll(new RegExp(`^  (?:if|elsif) event_type = '${escapeRegExp(eventType)}' then`, 'gm'))]
  const start = matches.at(-1)?.index ?? -1
  if (start < 0) return undefined
  const possibleEnds = [
    source.indexOf('\n  elsif event_type =', start + 1),
    source.indexOf("\n  else return 'Event type is unsupported.'", start + 1),
  ].filter(index => index >= 0)
  return source.slice(start, Math.min(...possibleEnds))
}

function sqlArray(value = "'{}'") {
  if (value === "'{}'") return []
  return [...value.matchAll(/'([^']+)'/g)].map(match => match[1]).sort()
}

function compareKeys(label, actual, expected) {
  const left = [...actual].sort()
  const right = [...expected].sort()
  if (JSON.stringify(left) !== JSON.stringify(right)) errors.push(`${label}: SQL has [${left.join(', ')}], Contract has [${right.join(', ')}].`)
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, canonical(child)]))
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
