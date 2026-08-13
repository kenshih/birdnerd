import { createUnavailableAuthModule, type AuthModule } from './authModule'
import { createE2EAuthModule } from './e2eAuth'
import { createSupabaseGoogleAuthModule } from './supabaseGoogleAuth'
import { getFieldSupabaseClient } from '../supabase/fieldSupabase'

export function createFieldAuthModule(): AuthModule {
  // Playwright sets this only for its Vite dev server; never add it to .env.local.
  if (import.meta.env.DEV && import.meta.env.VITE_E2E_ACCESS === 'true') return createE2EAuthModule()

  const supabase = getFieldSupabaseClient()
  if (!supabase) {
    return createUnavailableAuthModule('Google sign-in is not configured on this device.')
  }

  return createSupabaseGoogleAuthModule(supabase)
}
