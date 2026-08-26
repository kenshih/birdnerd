#!/usr/bin/env node
/**
 * Loads BirdNerd's one approved disposable local fixture. The public
 * Interface is intentionally only a fixture name; this Module owns every
 * privileged local step (reset, synthetic Auth, Provisioner bootstrap, and
 * authenticated Event admission) so callers cannot select a database or pass
 * credentials through the command line.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import YAML from 'yaml'
import { authorizeLocalFixtureEmailBootstrap, clearLocalFixtureEmailBootstrap, installLocalEmailSignupGuard } from './local-auth-hook.mjs'
import { markLoadedLocalFixture } from './local-fixture-marker.mjs'
import { commandSucceeded, localSupabaseSettings, runLocalSupabase } from './local-supabase.mjs'
import { withLocalFixtureProvisioner } from './local-fixture-provisioner.mjs'

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fixtureFiles = new Map([
  ['operational-workspace', resolve(rootDirectory, 'data/fixtures/operational-workspace.yaml')],
])

/** Parses the one intentional fixture selection; file paths and arbitrary SQL are never accepted. */
export function selectedFixtureName(arguments_) {
  if (arguments_.length !== 1 || !fixtureFiles.has(arguments_[0])) {
    throw new Error('Usage: npm run fixtures:load -- operational-workspace')
  }
  return arguments_[0]
}

/** Validates the narrowly declared operational fixture rather than accepting a generic seed shape. */
export function parseOperationalFixture(source, expectedName = 'operational-workspace') {
  const document = YAML.parseDocument(source, { prettyErrors: false })
  if (document.errors.length > 0) throw new Error(`Fixture YAML is invalid: ${document.errors[0]?.message}`)
  const value = document.toJSON()
  assertRecord(value, 'Fixture')
  assertExactKeys(value, ['version', 'fixture', 'workspace', 'members', 'operational'], 'Fixture')
  if (value.version !== 1) throw new Error('Fixture version must be 1.')
  if (value.fixture !== expectedName) throw new Error(`Fixture declaration must name ${expectedName}.`)

  assertRecord(value.workspace, 'Fixture workspace')
  assertExactKeys(value.workspace, ['name'], 'Fixture workspace')
  assertNonEmptyString(value.workspace.name, 'Fixture workspace name')

  if (!Array.isArray(value.members) || value.members.length !== 2) throw new Error('Fixture must declare exactly the Admin and Contributor members.')
  const members = value.members.map(member => parseFixtureMember(member))
  const admin = members.find(member => member.key === 'admin')
  const contributor = members.find(member => member.key === 'contributor')
  if (!admin || admin.role !== 'admin' || !contributor || contributor.role !== 'contributor') {
    throw new Error('Fixture must declare one admin and one contributor.')
  }
  if (new Set(members.map(member => member.email)).size !== members.length) throw new Error('Fixture Member emails must be distinct.')

  assertRecord(value.operational, 'Fixture operational data')
  assertExactKeys(value.operational, ['station', 'net', 'person', 'bander', 'band', 'session', 'banding_record'], 'Fixture operational data')
  const operational = parseOperational(value.operational)

  return { fixture: value.fixture, version: value.version, workspace: { name: value.workspace.name }, members, operational }
}

/**
 * Starts only the repository's CLI-local stack when needed, then verifies its
 * API, database, and trusted secret are all loopback before reset. The caller
 * supplies no database URL, so a linked or hosted project cannot become a
 * reset target through this Interface.
 */
export function resetVerifiedLocalStack(runSupabase) {
  let status = runSupabase(['status', '--output', 'env'], { capture: true })
  if (commandSucceeded(status)) {
    // The CLI applies config.toml only at container start. Reload the already
    // verified project so synthetic local email/password sessions cannot use
    // stale Auth configuration from an earlier checkout.
    localSupabaseSettings(status.stdout, { requireDatabase: true, requireSecret: true })
    const stop = runSupabase(['stop'])
    if (!commandSucceeded(stop)) throw new Error('The Supabase CLI could not stop the verified local stack for configuration reload.')
    const start = runSupabase(['start'])
    if (!commandSucceeded(start)) throw new Error('The Supabase CLI could not restart the local stack.')
    status = runSupabase(['status', '--output', 'env'], { capture: true })
  } else {
    const start = runSupabase(['start'])
    if (!commandSucceeded(start)) throw new Error('The Supabase CLI could not start the local stack.')
    status = runSupabase(['status', '--output', 'env'], { capture: true })
  }
  if (!commandSucceeded(status)) throw new Error('The Supabase CLI could not verify its local stack.')

  // Validate before the first destructive command. `--local` and `--no-seed`
  // then make the reset itself explicit and exclude any ambient SQL seed.
  const settings = localSupabaseSettings(status.stdout, { requireDatabase: true, requireSecret: true })
  const reset = runSupabase(['db', 'reset', '--local', '--no-seed', '--yes'])
  if (!commandSucceeded(reset)) throw new Error('The Supabase CLI could not reset the verified local database.')

  const afterReset = runSupabase(['status', '--output', 'env'], { capture: true })
  if (!commandSucceeded(afterReset)) throw new Error('The Supabase CLI could not verify the local stack after reset.')
  const resetSettings = localSupabaseSettings(afterReset.stdout, { requireDatabase: true, requireSecret: true })
  if (resetSettings.url !== settings.url || resetSettings.databaseUrl !== settings.databaseUrl) {
    throw new Error('The verified local Supabase target changed during reset; refusing to load fixture data.')
  }
  return resetSettings
}

/** Executes the complete trusted fixture workflow and returns only a safe receipt summary. */
export async function loadFixture(name, dependencies = {}) {
  const file = fixtureFiles.get(name)
  if (!file) throw new Error(`Unknown fixture: ${name}`)
  const read = dependencies.readFile ?? readFileSync
  const fixture = dependencies.fixture ?? parseOperationalFixture(read(file, 'utf8'), name)
  // Parsing is deliberately before reset: an edited/invalid fixture must not
  // disturb even the verified local database.
  const run = dependencies.runSupabase ?? runLocalSupabase
  const settings = resetVerifiedLocalStack(run)
  const runtime = dependencies.runtime ?? await loadRuntime()

  const database = new runtime.Client({ connectionString: settings.databaseUrl })
  await database.connect()
  try {
    await installLocalEmailSignupGuard(database)
    await authorizeLocalFixtureEmailBootstrap(database, fixture.members)
    try {
      await createSyntheticAuthUsers(runtime.createClient, settings, database, fixture.members)
    } finally {
      await clearLocalFixtureEmailBootstrap(database, fixture.members)
    }
    const bootstrap = await bootstrapThroughRestrictedProvisioner(runtime, settings.databaseUrl, database, fixture)

    const admin = await claimFixtureMember(runtime.createClient, settings, fixture.members.find(member => member.key === 'admin'))
    const contributor = await claimFixtureMember(runtime.createClient, settings, fixture.members.find(member => member.key === 'contributor'))
    const operations = await appendOperationalFixture(runtime, fixture, bootstrap.workspace_id, admin, contributor)
    const replay = await verifyReplay(runtime, bootstrap.workspace_id, admin, contributor, fixture, operations)
    await markLoadedLocalFixture(database, fixture, bootstrap.workspace_id)

    return {
      fixture: fixture.fixture,
      workspace_id: bootstrap.workspace_id,
      event_count: replay.event_count,
      receipt_count: operations.length,
    }
  } finally {
    await database.end()
  }
}

function parseFixtureMember(value) {
  assertRecord(value, 'Fixture Member')
  assertExactKeys(value, ['key', 'email', 'password', 'role'], 'Fixture Member')
  assertNonEmptyString(value.key, 'Fixture Member key')
  assertNonEmptyString(value.email, 'Fixture Member email')
  assertNonEmptyString(value.password, 'Fixture Member password')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value.email)) throw new Error('Fixture Member email must be an email address.')
  if (!['admin', 'contributor'].includes(value.role)) throw new Error('Fixture Member role must be admin or contributor.')
  return { key: value.key, email: value.email.toLowerCase(), password: value.password, role: value.role }
}

function parseOperational(value) {
  const station = child(value, 'station', ['name'])
  const net = child(value, 'net', ['label'])
  const person = child(value, 'person', ['name', 'initials'])
  const bander = child(value, 'bander', ['role'])
  const band = child(value, 'band', ['number', 'size', 'type'])
  const session = child(value, 'session', ['date', 'protocol', 'maps_period'])
  const bandingRecord = child(value, 'banding_record', ['species_code', 'capture_code', 'status'])
  for (const [label, record] of Object.entries({ station, net, person, bander, band, session, bandingRecord })) {
    for (const [key, entry] of Object.entries(record)) {
      if (key === 'maps_period') {
        if (!Number.isFinite(entry)) throw new Error(`Fixture ${label}.${key} must be a number.`)
      } else {
        assertNonEmptyString(entry, `Fixture ${label}.${key}`)
      }
    }
  }
  return { station, net, person, bander, band, session, banding_record: bandingRecord }
}

function child(parent, name, keys) {
  const value = parent[name]
  assertRecord(value, `Fixture operational ${name}`)
  assertExactKeys(value, keys, `Fixture operational ${name}`)
  return value
}

async function loadRuntime() {
  const [{ Client }, { createClient }, provisioner, banding, events] = await Promise.all([
    import('pg'),
    import('@supabase/supabase-js'),
    import('../apps/provisioner/dist/databaseProvisioner.js'),
    import('@birdnerd/banding'),
    import('@birdnerd/events'),
  ])
  return { Client, createClient, bootstrapWorkspace: provisioner.bootstrapWorkspace, decideOperationalCommand: banding.decideOperationalCommand, projectOperationalEvents: banding.projectOperationalEvents, projectWorkspaceEvents: banding.projectWorkspaceEvents, tickHlc: events.tickHlc }
}

async function createSyntheticAuthUsers(createClient, settings, database, members) {
  const admin = createClient(settings.url, settings.secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const users = []
  for (const member of members) {
    const { data, error } = await admin.auth.admin.createUser({
      email: member.email,
      password: member.password,
      email_confirm: true,
      app_metadata: { provider: 'email' },
    })
    if (error || !data.user) throw new Error(`Could not create synthetic local Auth user ${member.key}: ${error?.message ?? 'missing user'}`)
    // GoTrue has no Admin API for minting a social identity. The authenticated
    // claim intentionally trusts only its Google identity row, so this local-
    // only Auth bootstrap adds that synthetic identity before the real claim.
    await database.query(
      `insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
       values ($1, $2, $3::jsonb, 'google', clock_timestamp(), clock_timestamp(), clock_timestamp())
       on conflict (provider_id, provider) do update set
         user_id = excluded.user_id,
         identity_data = excluded.identity_data,
         last_sign_in_at = excluded.last_sign_in_at,
         updated_at = excluded.updated_at`,
      [`fixture-${member.key}`, data.user.id, JSON.stringify({ sub: `fixture-${member.key}`, email: member.email, email_verified: true })],
    )
    users.push({ key: member.key, id: data.user.id })
  }
  return users
}

async function bootstrapThroughRestrictedProvisioner(runtime, databaseUrl, database, fixture) {
  return withLocalFixtureProvisioner({
    Client: runtime.Client,
    databaseUrl,
    database,
    operation: provisioner => runtime.bootstrapWorkspace(provisioner, {
      workspace_name: fixture.workspace.name,
      provisioner_id: 'local-fixture-loader',
      members: fixture.members.map(member => ({ email: member.email, role: member.role })),
    }),
  })
}

async function claimFixtureMember(createClient, settings, member) {
  if (!member) throw new Error('Fixture Member is missing.')
  const client = createClient(settings.url, settings.publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  })
  const { data: signIn, error: signInError } = await client.auth.signInWithPassword({ email: member.email, password: member.password })
  if (signInError || !signIn.session) throw new Error(`Could not sign in synthetic local ${member.key}: ${signInError?.message ?? 'missing session'}`)
  const { data, error } = await client.rpc('birdnerd_claim_initial_access')
  if (error || !Array.isArray(data)) throw new Error(`Could not claim local ${member.key} Workspace access: ${error?.message ?? 'invalid receipt'}`)
  const linked = data.map(row => row?.event_json).find(event => event?.event_type === 'user-account.linked' && event?.payload?.identity?.email === member.email)
  const userAccountId = linked?.payload?.user_account_id
  if (typeof userAccountId !== 'string') throw new Error(`Local ${member.key} claim did not return its User Account.`)
  return { member, client, user_account_id: userAccountId }
}

async function appendOperationalFixture(runtime, fixture, workspaceId, admin, contributor) {
  const events = []
  let projection = runtime.projectOperationalEvents([])
  let highWater
  const nextContext = member => ({
    workspace_id: workspaceId,
    user_account_id: member.user_account_id,
    role: member.member.role,
    hlc: highWater = runtime.tickHlc(highWater),
  })
  const append = async (member, command) => {
    const decision = runtime.decideOperationalCommand(projection, nextContext(member), command)
    const { data, error } = await member.client.rpc('birdnerd_append_events', { events: decision.events })
    if (error || !Array.isArray(data)) throw new Error(`Could not append ${command.entity_kind ?? command.kind}: ${error?.message ?? 'invalid receipt'}`)
    if (data.length !== decision.events.length || data.some(row => row?.receipt?.kind !== 'accepted')) {
      throw new Error(`Local ${member.member.key} append did not receive accepted receipts.`)
    }
    events.push(...decision.events)
    projection = runtime.projectOperationalEvents(events)
    return decision.events
  }

  const [station] = await append(admin, { kind: 'create', entity_kind: 'station', fields: { name: fixture.operational.station.name } })
  const stationId = station.payload.station_id
  const [net] = await append(admin, { kind: 'create', entity_kind: 'net', station_id: stationId, fields: { label: fixture.operational.net.label } })
  const netId = net.payload.net_id
  const [person] = await append(admin, { kind: 'create', entity_kind: 'person', fields: fixture.operational.person })
  const personId = person.payload.person_id
  const [bander] = await append(admin, { kind: 'create', entity_kind: 'bander', person_id: personId, fields: fixture.operational.bander })
  const banderId = bander.payload.bander_id
  const [band] = await append(admin, { kind: 'receive-bands', bands: [{ band_number: fixture.operational.band.number, band_size: fixture.operational.band.size, band_type: fixture.operational.band.type }] })
  const bandId = band.payload.band_id
  const [session] = await append(contributor, {
    kind: 'create', entity_kind: 'session', fields: {
      session_date: fixture.operational.session.date,
      station_id: stationId,
      protocol: fixture.operational.session.protocol,
      maps_period: fixture.operational.session.maps_period,
      master_bander_id: banderId,
    },
  })
  const sessionId = session.payload.session_id
  await append(contributor, {
    kind: 'create', entity_kind: 'banding-record', session_id: sessionId, fields: {
      species_code: fixture.operational.banding_record.species_code,
      capture_code: fixture.operational.banding_record.capture_code,
      status: fixture.operational.banding_record.status,
      net_id: netId,
      bander_id: banderId,
      band_selection: { kind: 'managed', band_id: bandId, band_number: fixture.operational.band.number },
    },
  })
  return events
}

async function verifyReplay(runtime, workspaceId, admin, contributor, fixture, operations) {
  const adminRows = await pullAll(admin.client, workspaceId)
  const contributorRows = await pullAll(contributor.client, workspaceId)
  if (JSON.stringify(adminRows) !== JSON.stringify(contributorRows)) throw new Error('Fixture Members did not replay the same server-ordered history.')
  const replayed = adminRows.map(row => row.event_json)
  const counts = eventCounts(replayed)
  const expected = {
    'workspace.created': 1,
    'membership.preauthorized': 2,
    'user-account.linked': 2,
    'membership.activated': 2,
    'station.created': 1,
    'net.created': 1,
    'person.created': 1,
    'bander.created': 1,
    'band.received': 1,
    'session.created': 1,
    'banding-record.created': 1,
  }
  if (Object.keys(counts).length !== Object.keys(expected).length || Object.entries(expected).some(([type, count]) => counts[type] !== count)) {
    throw new Error('Fixture replay did not contain exactly the declared Workspace history.')
  }
  const projection = runtime.projectOperationalEvents(replayed)
  if (projection.entities.size !== 7 || projection.unresolved_references.length !== 0) throw new Error('Fixture replay did not rebuild the declared operational projection.')
  const workspaceProjection = runtime.projectWorkspaceEvents(replayed)
  if (workspaceProjection.workspace_memberships.size !== 2) throw new Error('Fixture replay did not rebuild both Workspace Memberships.')
  if (operations.length !== 7 || !replayed.some(event => event.actor?.user_account_id === admin.user_account_id) || !replayed.some(event => event.actor?.user_account_id === contributor.user_account_id)) {
    throw new Error('Fixture replay did not retain both Members\' authenticated append history.')
  }
  if (fixture.fixture !== 'operational-workspace') throw new Error('Fixture replay used an unexpected declaration.')
  return { event_count: replayed.length }
}

async function pullAll(client, workspaceId) {
  const { data, error } = await client.rpc('birdnerd_pull_events', {
    workspace_id: workspaceId,
    after_server_sequence: 0,
    page_size: 100,
  })
  if (error || !Array.isArray(data)) throw new Error(`Could not replay local fixture: ${error?.message ?? 'invalid pull response'}`)
  let previous = 0
  for (const row of data) {
    if (!Number.isSafeInteger(row?.server_sequence) || row.server_sequence <= previous || !row.event_json) {
      throw new Error('Local fixture replay returned invalid server ordering.')
    }
    previous = row.server_sequence
  }
  return data
}

function eventCounts(events) {
  return events.reduce((counts, event) => ({ ...counts, [event.event_type]: (counts[event.event_type] ?? 0) + 1 }), {})
}

function assertRecord(value, label) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(`${label} must be an object.`)
}

function assertExactKeys(value, keys, label) {
  if (Object.keys(value).length !== keys.length || keys.some(key => !(key in value))) throw new Error(`${label} has unsupported or missing fields.`)
}

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(`${label} must be a non-empty string.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const fixture = selectedFixtureName(process.argv.slice(2))
    const receipt = await loadFixture(fixture)
    console.log(`Loaded ${receipt.fixture}: Workspace ${receipt.workspace_id}, ${receipt.event_count} Events, ${receipt.receipt_count} authenticated append receipts, replay verified.`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
