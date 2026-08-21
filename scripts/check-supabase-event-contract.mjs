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
  .map(contract => ({ eventType: contract.schema.title.replace(/ v1$/, ''), schema: contract.schema }))
  .sort((left, right) => left.eventType.localeCompare(right.eventType))
const fingerprint = createHash('sha256')
  .update(JSON.stringify(canonical({ envelope, payloads: Object.fromEntries(payloads.map(item => [item.eventType, item.schema])) })))
  .digest('hex')

if (process.argv.includes('--print-fingerprint')) {
  console.log(fingerprint)
  process.exit(0)
}

const migrationFiles = (await readdir(migrationDirectory)).filter(file => /_phase_(30_event_exchange|31_operational_catalog)\.sql$/.test(file)).sort()
if (migrationFiles.length !== 2) throw new Error(`Expected Phase 30 and Phase 31 Event-exchange migrations; found ${migrationFiles.length}.`)
const sql = (await Promise.all(migrationFiles.map(file => readFile(resolve(migrationDirectory, file), 'utf8')))).join('\n')
const errors = []
const marker = [...sql.matchAll(/event-contract-sha256:\s*([0-9a-f]{64})/g)].at(-1)?.[1]
if (marker !== fingerprint) errors.push(`SQL Event Contract fingerprint is stale (expected ${fingerprint}).`)

checkExactKeys(sql, "event", envelope, 'Event envelope')
checkExactKeys(sql, "event -> 'hlc'", envelope.properties.hlc, 'Event HLC')

const sqlEventTypes = [...sql.matchAll(/(?:if|elsif) event_type = '([^']+)' then/g)].map(match => match[1]).sort()
compareKeys('SQL Event Type branches', sqlEventTypes, payloads.map(item => item.eventType))

for (const { eventType, schema } of payloads) {
  const branch = eventTypeBranch(sql, eventType)
  if (!branch) {
    errors.push(`SQL validator has no branch for ${eventType}.`)
    continue
  }
  checkExactKeys(branch, 'payload', schema, `${eventType} payload`)
  for (const [property, propertySchema] of Object.entries(schema.properties ?? {})) {
    if (propertySchema.type !== 'object') continue
    if (property === 'identity' && branch.includes("payload -> 'identity' <> actor -> 'identity'")) continue
    checkExactKeys(branch, `payload -> '${property}'`, propertySchema, `${eventType}.${property}`)
  }
}

if (errors.length > 0) {
  console.error(`Supabase Event validator is out of sync with the YAML Contracts:\n- ${errors.join('\n- ')}`)
  process.exitCode = 1
}

function checkExactKeys(source, subject, schema, label) {
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
  const start = source.indexOf(`event_type = '${eventType}' then`)
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
