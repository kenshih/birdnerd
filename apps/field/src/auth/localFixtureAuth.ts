import type { AuthModule, AuthSignInAction } from './authModule'
import { createSupabaseSessionAuthModule, type SupabaseSessionPort, type SupabaseSignInAdapter } from './supabaseSessionAuth'

type SupabaseLocalFixtureAuthPort = SupabaseSessionPort & {
  auth: SupabaseSessionPort['auth'] & {
    signInWithPassword(credentials: { email: string; password: string }): Promise<{ error: Error | null }>
  }
}

export type LocalFixtureProfile = {
  id: 'fixture-admin' | 'fixture-contributor'
  label: string
  email: string
  password: string
}

const expectedProfiles: Readonly<Record<LocalFixtureProfile['id'], { label: string }>> = {
  'fixture-admin': { label: 'Continue as Fixture Admin' },
  'fixture-contributor': { label: 'Continue as Fixture Contributor' },
}

/**
 * Parses only the two profiles emitted by the verified local launcher. The
 * browser receives the known disposable fixture passwords, never a Supabase
 * secret, database URL, or arbitrary account selector.
 */
export function parseLocalFixtureProfiles(source: string | undefined): readonly LocalFixtureProfile[] {
  if (!source) throw new Error('Local fixture profiles are unavailable. Run the fixture loader, then restart `npm run dev`.')

  let value: unknown
  try {
    value = JSON.parse(source)
  } catch {
    throw new Error('Local fixture profiles are invalid. Restart `npm run dev`.')
  }
  if (!Array.isArray(value) || value.length !== 2) throw new Error('Local fixture profiles must contain exactly the Admin and Contributor.')

  const profiles = value.map(parseProfile)
  const byId = new Map(profiles.map(profile => [profile.id, profile]))
  if (byId.size !== 2 || !byId.has('fixture-admin') || !byId.has('fixture-contributor')) {
    throw new Error('Local fixture profiles must contain the declared Admin and Contributor.')
  }

  return (['fixture-admin', 'fixture-contributor'] as const).map(id => byId.get(id)!)
}

/** Returns true only for the CLI-local HTTP endpoints accepted by the launcher. */
export function isLoopbackSupabaseUrl(value: string | undefined): boolean {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]' || url.hostname === '::1')
  } catch {
    return false
  }
}

/** Local email/password interaction Adapter for the shared Supabase-session Module. */
export function createLocalFixtureSignInAdapter(
  supabase: SupabaseLocalFixtureAuthPort,
  profiles: readonly LocalFixtureProfile[],
): SupabaseSignInAdapter {
  const signInActions: readonly AuthSignInAction[] = profiles.map(({ id, label }) => ({ id, label }))

  return {
    signInActions,
    async beginSignIn(actionId) {
      const profile = profiles.find(candidate => candidate.id === actionId)
      if (!profile) return { error: new Error('The selected sign-in method is unavailable.') }
      return supabase.auth.signInWithPassword({ email: profile.email, password: profile.password })
    },
  }
}

/** Development-only local fixture Adapter for Field's provider-neutral Auth Module Interface. */
export function createLocalFixtureAuthModule(
  supabase: SupabaseLocalFixtureAuthPort,
  profiles: readonly LocalFixtureProfile[],
): AuthModule {
  return createSupabaseSessionAuthModule(supabase, createLocalFixtureSignInAdapter(supabase, profiles))
}

function parseProfile(value: unknown): LocalFixtureProfile {
  if (!isRecord(value) || Object.keys(value).length !== 4 || !hasExactlyKeys(value, ['id', 'label', 'email', 'password'])) {
    throw new Error('Local fixture profile has unsupported or missing fields.')
  }
  if (value.id !== 'fixture-admin' && value.id !== 'fixture-contributor') throw new Error('Local fixture profile has an unsupported action.')
  if (value.label !== expectedProfiles[value.id].label) throw new Error('Local fixture profile label does not match the declared fixture action.')
  if (!isNonEmptyString(value.email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value.email)) throw new Error('Local fixture profile email is invalid.')
  if (!isNonEmptyString(value.password)) throw new Error('Local fixture profile password is invalid.')
  return { id: value.id, label: value.label, email: value.email, password: value.password }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every(key => key in value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
}
