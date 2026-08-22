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

  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !isLoopbackHost(parsed.hostname)) {
    throw new Error(`${description} must be a postgresql:// loopback endpoint; refusing a non-local target.`)
  }
}

export function isLoopbackHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1'
}

function unquote(value) {
  if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
    return value.slice(1, -1)
  }
  return value
}
