#!/usr/bin/env node
/**
 * Pre-authorizes one real Google identity for the current disposable local
 * fixture. It accepts no database URL or SQL and reaches the database only
 * after the repository's CLI-local stack passes the loopback check.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseOperationalFixture } from './fixture-loader.mjs'
import { withLocalFixtureProvisioner } from './local-fixture-provisioner.mjs'
import { commandSucceeded, localSupabaseSettings, runLocalSupabase } from './local-supabase.mjs'

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fixturePath = resolve(rootDirectory, 'data/fixtures/operational-workspace.yaml')
const provisionerId = 'local-fixture-invite'

/** Parses the fixed local invitation command before any local service starts. */
export function parseFixtureInviteOptions(arguments_) {
  const values = new Map()
  for (let index = 0; index < arguments_.length; index += 1) {
    const flag = arguments_[index]
    if (!['--workspace-id', '--email', '--role'].includes(flag)) throw new Error(helpText())
    const value = arguments_[index + 1]
    if (!value || value.startsWith('--') || values.has(flag)) throw new Error(helpText())
    values.set(flag, value)
    index += 1
  }

  const workspace_id = values.get('--workspace-id')
  const email = values.get('--email')?.trim().toLowerCase()
  const role = values.get('--role')
  if (!isUuidV7(workspace_id) || !isEmail(email) || (role !== 'admin' && role !== 'contributor')) throw new Error(helpText())
  return { workspace_id: workspace_id.toLowerCase(), email, role }
}

/** Starts only the project-local stack when necessary, then rejects non-local settings. */
export function verifiedLocalFixtureSettings(runSupabase = runLocalSupabase) {
  let status = runSupabase(['status', '--output', 'env'], { capture: true })
  if (!commandSucceeded(status)) {
    const start = runSupabase(['start'])
    if (!commandSucceeded(start)) throw new Error('The Supabase CLI could not start the local stack.')
    status = runSupabase(['status', '--output', 'env'], { capture: true })
  }
  if (!commandSucceeded(status)) throw new Error('The Supabase CLI could not verify its local stack.')
  return localSupabaseSettings(status.stdout, { requireDatabase: true })
}

/** Invokes only the existing restricted Provisioner invite operation. */
export async function inviteFixtureMember(options, dependencies = {}) {
  const settings = verifiedLocalFixtureSettings(dependencies.runSupabase)
  const fixture = parseOperationalFixture((dependencies.readFile ?? readFileSync)(fixturePath, 'utf8'))
  const runtime = dependencies.runtime ?? await loadRuntime()
  const database = new runtime.Client({ connectionString: settings.databaseUrl })
  await database.connect()
  try {
    if (!await isDeclaredFixtureWorkspace(database, options.workspace_id, fixture.workspace.name)) {
      throw new Error('Workspace ID is not the current operational fixture. Run `npm run fixtures:load -- operational-workspace` and use its receipt Workspace ID.')
    }
    return await withLocalFixtureProvisioner({
      Client: runtime.Client,
      databaseUrl: settings.databaseUrl,
      database,
      operation: provisioner => runtime.changeMembership(provisioner, 'invite', { ...options, provisioner_id: provisionerId }),
    })
  } finally {
    await database.end()
  }
}

async function isDeclaredFixtureWorkspace(database, workspaceId, workspaceName) {
  const result = await database.query(
    `select exists (
       select 1 from birdnerd_private.event_log
       where workspace_id = $1::uuid
         and event_json ->> 'event_type' = 'workspace.created'
         and event_json -> 'payload' ->> 'workspace_id' = $1::text
         and event_json -> 'payload' ->> 'name' = $2
     ) as fixture_workspace`,
    [workspaceId, workspaceName],
  )
  return result.rows[0]?.fixture_workspace === true
}

async function loadRuntime() {
  const [{ Client }, provisioner] = await Promise.all([
    import('pg'),
    import('../apps/provisioner/dist/databaseProvisioner.js'),
  ])
  return { Client, changeMembership: provisioner.changeMembership }
}

function isUuidV7(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)
}

function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)
}

function helpText() {
  return 'Usage: npm run fixtures:invite -- --workspace-id <fixture-workspace-uuid> --email person@example.com --role <admin-or-contributor>'
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const receipt = await inviteFixtureMember(parseFixtureInviteOptions(process.argv.slice(2)))
    console.log(JSON.stringify(receipt, null, 2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
