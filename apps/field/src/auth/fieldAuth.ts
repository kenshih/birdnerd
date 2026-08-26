import { createUnavailableAuthModule, type AuthModule } from './authModule'
import { createE2EAuthModule } from './e2eAuth'
import { createLocalFixtureAuthModule, isLoopbackSupabaseUrl, parseLocalFixtureProfiles, type LocalFixtureProfile } from './localFixtureAuth'
import { createSupabaseGoogleAuthModule } from './supabaseGoogleAuth'
import { getFieldSupabaseClient } from '../supabase/fieldSupabase'

type FieldAuthEnvironment = {
  DEV: boolean
  VITE_E2E_ACCESS?: string
  VITE_FIELD_DEVELOPMENT_TARGET?: string
  VITE_LOCAL_FIXTURE_AUTH_PROFILES?: string
  VITE_SUPABASE_URL?: string
}

export type FieldAuthSelection =
  | { kind: 'e2e' }
  | { kind: 'local-fixture'; profiles: readonly LocalFixtureProfile[] }
  | { kind: 'local-unavailable'; message: string }
  | { kind: 'google' }

/**
 * Selects an Auth Adapter from build-time configuration. Local fixture Auth
 * and the local Google OAuth path are available only from their development
 * launcher markers plus a loopback URL; pilot and production retain Google.
 */
export function selectFieldAuthAdapter(environment: FieldAuthEnvironment): FieldAuthSelection {
  // Playwright sets this only for its dedicated Vite development server.
  if (environment.DEV && environment.VITE_E2E_ACCESS === 'true') return { kind: 'e2e' }
  if (!environment.DEV) return { kind: 'google' }

  const target = environment.VITE_FIELD_DEVELOPMENT_TARGET
  if (target === 'local-google') {
    if (!isLoopbackSupabaseUrl(environment.VITE_SUPABASE_URL)) {
      return { kind: 'local-unavailable', message: 'Local Google OAuth requires the verified loopback Supabase target from `npm run dev:local-google`.' }
    }
    return { kind: 'google' }
  }

  if (target !== 'local') return { kind: 'google' }
  if (!isLoopbackSupabaseUrl(environment.VITE_SUPABASE_URL)) {
    return { kind: 'local-unavailable', message: 'Local fixture authentication requires the verified loopback Supabase target from `npm run dev`.' }
  }

  try {
    return { kind: 'local-fixture', profiles: parseLocalFixtureProfiles(environment.VITE_LOCAL_FIXTURE_AUTH_PROFILES) }
  } catch (error) {
    return { kind: 'local-unavailable', message: error instanceof Error ? error.message : 'Local fixture authentication is unavailable.' }
  }
}

export function createFieldAuthModule(): AuthModule {
  const selection = selectFieldAuthAdapter(import.meta.env)
  if (selection.kind === 'e2e') return createE2EAuthModule()
  if (selection.kind === 'local-unavailable') return createUnavailableAuthModule(selection.message)

  const supabase = getFieldSupabaseClient()
  if (!supabase) {
    return createUnavailableAuthModule('Google sign-in is not configured on this device.')
  }

  if (selection.kind === 'local-fixture') return createLocalFixtureAuthModule(supabase, selection.profiles)
  return createSupabaseGoogleAuthModule(supabase)
}
