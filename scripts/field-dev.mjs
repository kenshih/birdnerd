#!/usr/bin/env node
/**
 * Starts Field against one deliberate Supabase target.
 *
 * The default interface is local-only: it starts (or verifies) the CLI-managed
 * Docker stack, reads that stack's own published browser settings, and gives
 * those settings precedence over any uncommitted Vite env files. The explicit
 * `dev:local-google` path restarts that same local stack to apply its local
 * Google-provider configuration. The separate `dev:pilot` interface requires
 * an explicitly named local env file and never manages a Supabase stack.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Client } from 'pg'
import { installLocalEmailSignupGuard } from './local-auth-hook.mjs'
import { commandSucceeded, isLoopbackHost, localSupabaseSettings, parseEnvVariables, runLocalSupabase } from './local-supabase.mjs'
import { localFixtureAuthProfiles } from './local-fixture-profiles.mjs'

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fieldDirectory = resolve(rootDirectory, 'apps/field')
const pilotEnvPath = resolve(fieldDirectory, '.env.pilot.local')

export { parseEnvVariables }

/**
 * Converts `supabase status --output env` output into the only Field settings
 * that may be exposed to the browser. It rejects every non-loopback endpoint,
 * so a changed CLI configuration cannot silently direct the default command at
 * a hosted project.
 */
export function localFieldSettings(statusOutput) {
  const { url, publishableKey } = localSupabaseSettings(statusOutput)
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

/**
 * Builds the Vite environment for supported non-E2E Field commands. The
 * fixture path replaces ambient profile settings with the one declared
 * fixture; local Google and pilot paths clear them so they select Google Auth.
 */
export function fieldViteEnvironment(environment, settings, target) {
  const {
    VITE_E2E_ACCESS: _e2eAccess,
    VITE_FIELD_DEVELOPMENT_TARGET: _developmentTarget,
    VITE_LOCAL_FIXTURE_AUTH_PROFILES: _fixtureProfiles,
    ...withoutDevelopmentAuthSettings
  } = environment
  const fixtureProfiles = target === 'local' ? JSON.stringify(localFixtureAuthProfiles()) : ''
  return {
    ...withoutDevelopmentAuthSettings,
    VITE_SUPABASE_URL: settings.url,
    VITE_SUPABASE_PUBLISHABLE_KEY: settings.publishableKey,
    // Vite gives inherited process variables priority over env files. Pin this
    // to an explicit non-E2E value for both normal command interfaces.
    VITE_E2E_ACCESS: 'false',
    VITE_FIELD_DEVELOPMENT_TARGET: target,
    VITE_LOCAL_FIXTURE_AUTH_PROFILES: fixtureProfiles,
  }
}

/**
 * Selects the command's fixed target before any stack or Vite work begins.
 * Keeping this marker in package scripts means an appended `--target=pilot`
 * cannot turn the default `npm run dev` command into a hosted session.
 */
export function developmentTarget(arguments_) {
  const targetArguments = arguments_.filter(argument => argument.startsWith('--target='))
  if (targetArguments.length !== 1) {
    throw new Error('Exactly one development target is required. Use `npm run dev` for fixtures, `npm run dev:local-google` for local Google OAuth, or `npm run dev:pilot` for hosted pilot testing.')
  }

  const target = targetArguments[0].slice('--target='.length)
  if (target !== 'local' && target !== 'local-google' && target !== 'pilot') {
    throw new Error('Development target must be `local`, `local-google`, or `pilot`.')
  }
  return target
}

/**
 * Maps a Field development target to a Vite mode.
 *
 * Vite reserves the mode name 'local' for its `.env.local` file convention,
 * so the 'local' target is mapped to 'field-local' mode instead.
 */
export function viteModeForTarget(target) {
  return target === 'pilot' ? 'pilot' : 'field-local'
}

async function localSettingsFromRunningStack({ reloadConfiguration = false } = {}) {
  const localGoogleOptions = { requireGoogleOAuth: reloadConfiguration }
  let status = runLocalSupabase(['status', '--output', 'env'], { capture: true, ...localGoogleOptions })
  if (commandSucceeded(status) && reloadConfiguration) {
    // Google provider configuration is applied only at container start. Verify
    // this project's running authority before stopping its local containers.
    localFieldSettings(status.stdout)
    console.log('Reloading the verified local Supabase stack for Google OAuth configuration…')
    const stop = runLocalSupabase(['stop'], localGoogleOptions)
    if (!commandSucceeded(stop)) process.exit(stop.status ?? 1)
    const start = runLocalSupabase(['start'], localGoogleOptions)
    if (!commandSucceeded(start)) process.exit(start.status ?? 1)
    status = runLocalSupabase(['status', '--output', 'env'], { capture: true, ...localGoogleOptions })
  } else if (!commandSucceeded(status)) {
    console.log('Local Supabase is not running; starting the CLI-managed Docker stack…')
    const start = runLocalSupabase(['start'], localGoogleOptions)
    if (!commandSucceeded(start)) process.exit(start.status ?? 1)
    status = runLocalSupabase(['status', '--output', 'env'], { capture: true, ...localGoogleOptions })
  }

  if (!commandSucceeded(status)) {
    console.error('Supabase reported that the local stack is unavailable after start. Run `npx supabase status` for details.')
    process.exit(status.status ?? 1)
  }

  if (!reloadConfiguration) return localFieldSettings(status.stdout)

  const settings = localSupabaseSettings(status.stdout, { requireDatabase: true })
  const database = new Client({ connectionString: settings.databaseUrl })
  await database.connect()
  try {
    await installLocalEmailSignupGuard(database)
  } finally {
    await database.end()
  }
  return { url: settings.url, publishableKey: settings.publishableKey }
}

function pilotSettingsFromFile() {
  if (!existsSync(pilotEnvPath)) {
    throw new Error('Hosted pilot configuration is absent. Create the uncommitted apps/field/.env.pilot.local file, then run this explicit command again.')
  }
  return hostedPilotSettings(readFileSync(pilotEnvPath, 'utf8'))
}

function viteArguments(arguments_, mode) {
  if (arguments_.some(argument => argument === '--mode' || argument.startsWith('--mode='))) {
    throw new Error('The Field development mode is selected by the npm command. Use `npm run dev`, `npm run dev:local-google`, or `npm run dev:pilot`.')
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

async function main() {
  const arguments_ = process.argv.slice(2)
  const target = developmentTarget(arguments_)
  const viteArgs = arguments_.filter(argument => !argument.startsWith('--target='))
  const settings = target === 'pilot'
    ? pilotSettingsFromFile()
    : await localSettingsFromRunningStack({ reloadConfiguration: target === 'local-google' })
  const mode = viteModeForTarget(target)

  console.log(target === 'pilot'
    ? 'Starting Field against the explicitly configured hosted pilot.'
    : `Starting Field against verified local Supabase at ${settings.url}.`)
  runVite(viteArguments(viteArgs, mode), fieldViteEnvironment(process.env, settings, target))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main()
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
