#!/usr/bin/env node
/**
 * Starts Field against one deliberate Supabase target.
 *
 * The default interface is local-only: it starts (or verifies) the CLI-managed
 * Docker stack, reads that stack's own published browser settings, and gives
 * those settings precedence over any uncommitted Vite env files. The separate
 * `--pilot` interface requires an explicitly named local env file and never
 * manages a Supabase stack.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fieldDirectory = resolve(rootDirectory, 'apps/field')
const pilotEnvPath = resolve(fieldDirectory, '.env.pilot.local')

export function parseEnvVariables(source) {
  const values = {}

  for (const line of source.split(/\r?\n/u)) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
    if (!match) continue
    const [, name, rawValue] = match
    values[name] = unquote(rawValue)
  }

  return values
}

/**
 * Converts `supabase status --output env` output into the only Field settings
 * that may be exposed to the browser. It rejects every non-loopback endpoint,
 * so a changed CLI configuration cannot silently direct the default command at
 * a hosted project.
 */
export function localFieldSettings(statusOutput) {
  const settings = parseEnvVariables(statusOutput)
  const url = settings.API_URL
  const publishableKey = settings.PUBLISHABLE_KEY ?? settings.ANON_KEY

  if (!url) throw new Error('Local Supabase status did not provide API_URL.')
  if (!publishableKey) throw new Error('Local Supabase status did not provide PUBLISHABLE_KEY or ANON_KEY.')
  assertLoopbackHttpUrl(url, 'Local Supabase API_URL')

  return { url, publishableKey }
}

/**
 * Validates the narrowly scoped opt-in hosted configuration. It deliberately
 * cannot reuse the default local `.env.local`, which keeps routine development
 * from targeting the pilot by accident.
 */
export function hostedPilotSettings(envSource) {
  const settings = parseEnvVariables(envSource)
  const url = settings.VITE_SUPABASE_URL
  const publishableKey = settings.VITE_SUPABASE_PUBLISHABLE_KEY

  if (!url) throw new Error('Hosted pilot configuration is missing VITE_SUPABASE_URL.')
  if (!publishableKey) throw new Error('Hosted pilot configuration is missing VITE_SUPABASE_PUBLISHABLE_KEY.')

  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Hosted pilot VITE_SUPABASE_URL must be a valid URL.')
  }

  if (isLoopbackHost(parsed.hostname)) {
    throw new Error('Hosted pilot configuration must not point at a loopback Supabase URL.')
  }
  if (parsed.protocol !== 'https:') {
    throw new Error('Hosted pilot VITE_SUPABASE_URL must use HTTPS.')
  }

  return { url, publishableKey }
}

export function localViteEnvironment(environment, settings) {
  const { VITE_E2E_ACCESS: _e2eAccess, ...withoutE2EAccess } = environment
  return {
    ...withoutE2EAccess,
    VITE_SUPABASE_URL: settings.url,
    VITE_SUPABASE_PUBLISHABLE_KEY: settings.publishableKey,
    // Vite gives inherited process variables priority over env files. Pin this
    // to the non-fixture value for both normal command interfaces.
    VITE_E2E_ACCESS: 'false',
  }
}

function unquote(value) {
  if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
    return value.slice(1, -1)
  }
  return value
}

function assertLoopbackHttpUrl(value, description) {
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`${description} must be a valid URL.`)
  }

  if (parsed.protocol !== 'http:' || !isLoopbackHost(parsed.hostname)) {
    throw new Error(`${description} must be an http://localhost, http://127.0.0.1, or http://[::1] endpoint; refusing a non-local target.`)
  }
}

function isLoopbackHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1'
}

function commandSucceeded(command) {
  return command.error === undefined && command.status === 0
}

function runSupabase(arguments_, options = {}) {
  return spawnSync('npx', ['--no-install', 'supabase', ...arguments_], {
    cwd: rootDirectory,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  })
}

function localSettingsFromRunningStack() {
  let status = runSupabase(['status', '--output', 'env'], { capture: true })
  if (!commandSucceeded(status)) {
    console.log('Local Supabase is not running; starting the CLI-managed Docker stack…')
    const start = runSupabase(['start'])
    if (!commandSucceeded(start)) process.exit(start.status ?? 1)
    status = runSupabase(['status', '--output', 'env'], { capture: true })
  }

  if (!commandSucceeded(status)) {
    console.error('Supabase reported that the local stack is unavailable after start. Run `npx supabase status` for details.')
    process.exit(status.status ?? 1)
  }

  return localFieldSettings(status.stdout)
}

function pilotSettingsFromFile() {
  if (!existsSync(pilotEnvPath)) {
    throw new Error('Hosted pilot configuration is absent. Create the uncommitted apps/field/.env.pilot.local file, then run this explicit command again.')
  }
  return hostedPilotSettings(readFileSync(pilotEnvPath, 'utf8'))
}

function viteArguments(arguments_, mode) {
  if (arguments_.some(argument => argument === '--mode' || argument.startsWith('--mode='))) {
    throw new Error('The Field development mode is selected by the npm command. Use `npm run dev` for local or `npm run dev:pilot` for hosted pilot testing.')
  }
  return ['--mode', mode, ...arguments_]
}

function runVite(arguments_, environment) {
  const vite = spawnSync('npx', ['--no-install', 'vite', ...arguments_], {
    cwd: fieldDirectory,
    env: environment,
    stdio: 'inherit',
  })
  process.exitCode = vite.status ?? 1
}

function main() {
  const arguments_ = process.argv.slice(2)
  const pilot = arguments_.includes('--pilot')
  const viteArgs = arguments_.filter(argument => argument !== '--pilot')
  const settings = pilot ? pilotSettingsFromFile() : localSettingsFromRunningStack()
  const mode = pilot ? 'pilot' : 'local'

  console.log(pilot
    ? 'Starting Field against the explicitly configured hosted pilot.'
    : `Starting Field against verified local Supabase at ${settings.url}.`)
  runVite(viteArguments(viteArgs, mode), localViteEnvironment(process.env, settings))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
