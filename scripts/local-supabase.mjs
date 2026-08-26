import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const localEnvPath = resolve(rootDirectory, '.env')
const localGoogleOAuthVariables = [
  'SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID',
  'SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET',
]

/**
 * Parses the CLI-managed local Supabase stack's status output.  Both Field's
 * browser launcher and trusted local tooling use this Module so neither can
 * quietly follow an arbitrary endpoint supplied by an environment file.
 */
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
 * Returns settings published by `supabase status --output env` only after
 * every requested authority is tied to loopback.  A secret key is deliberately
 * available to trusted Node tooling only; callers must never pass it to Vite.
 */
export function localSupabaseSettings(statusOutput, { requireDatabase = false, requireSecret = false } = {}) {
  const settings = parseEnvVariables(statusOutput)
  const url = settings.API_URL
  const publishableKey = settings.PUBLISHABLE_KEY ?? settings.ANON_KEY
  const databaseUrl = settings.DB_URL ?? settings.DATABASE_URL
  const secretKey = settings.SECRET_KEY ?? settings.SERVICE_ROLE_KEY

  if (!url) throw new Error('Local Supabase status did not provide API_URL.')
  if (!publishableKey) throw new Error('Local Supabase status did not provide PUBLISHABLE_KEY or ANON_KEY.')
  assertLoopbackHttpUrl(url, 'Local Supabase API_URL')

  if (requireDatabase) {
    if (!databaseUrl) throw new Error('Local Supabase status did not provide DB_URL.')
    assertLoopbackDatabaseUrl(databaseUrl, 'Local Supabase DB_URL')
  }
  if (requireSecret && !secretKey) throw new Error('Local Supabase status did not provide a local secret key.')

  return { url, publishableKey, databaseUrl, secretKey }
}

export function assertLoopbackHttpUrl(value, description) {
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

export function assertLoopbackDatabaseUrl(value, description) {
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`${description} must be a valid PostgreSQL URL.`)
  }

  // `pg` permits URI query settings such as `?host=...`, which can override
  // the apparent authority. The CLI's own DB_URL needs none, so reject every
  // query/fragment rather than attempting to maintain a partial allow-list.
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !isLoopbackHost(parsed.hostname) || parsed.search || parsed.hash) {
    throw new Error(`${description} must be a postgresql:// loopback endpoint; refusing a non-local target.`)
  }
}

export function isLoopbackHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1'
}

/**
 * Supplies only local Google OAuth configuration to the trusted Supabase CLI
 * process. The uncommitted project-root .env file never reaches Vite or Field.
 */
export function localSupabaseEnvironment(environment = process.env, envSource = localEnvSource(), { requireGoogleOAuth = false } = {}) {
  const localValues = parseEnvVariables(envSource)
  const missingGoogleOAuth = localGoogleOAuthVariables.filter(name => !localValues[name]?.trim())
  if (requireGoogleOAuth && missingGoogleOAuth.length > 0) {
    throw new Error(`Local Google OAuth configuration is missing ${missingGoogleOAuth.join(' and ')} in the project-root .env file.`)
  }
  const localGoogleOAuth = Object.fromEntries(
    localGoogleOAuthVariables
      .filter(name => localValues[name] !== undefined)
      .map(name => [name, localValues[name]]),
  )
  const {
    SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID: _ambientGoogleClientId,
    SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET: _ambientGoogleClientSecret,
    ...withoutAmbientGoogleOAuth
  } = environment
  return { ...withoutAmbientGoogleOAuth, ...localGoogleOAuth }
}

/** Runs a repository-local Supabase CLI command at the one shared boundary. */
export function runLocalSupabase(arguments_, { capture = false, requireGoogleOAuth = false } = {}) {
  return spawnSync('npx', ['--no-install', 'supabase', ...arguments_], {
    cwd: rootDirectory,
    env: localSupabaseEnvironment(process.env, localEnvSource(), { requireGoogleOAuth }),
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  })
}

export function commandSucceeded(command) {
  return command.error === undefined && command.status === 0
}

function unquote(value) {
  if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
    return value.slice(1, -1)
  }
  return value
}

function localEnvSource() {
  return existsSync(localEnvPath) ? readFileSync(localEnvPath, 'utf8') : ''
}
