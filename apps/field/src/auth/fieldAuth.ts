import { createClient } from '@supabase/supabase-js'
import { createUnavailableAuthModule, type AuthModule } from './authModule'
import { createE2EAuthModule } from './e2eAuth'
import { createSupabaseGoogleAuthModule } from './supabaseGoogleAuth'

export function createFieldAuthModule(): AuthModule {
  if (import.meta.env.DEV && import.meta.env.VITE_E2E_ACCESS === 'true') return createE2EAuthModule()

  const url = import.meta.env.VITE_SUPABASE_URL ?? ''
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''

  if (!url || !publishableKey) {
    return createUnavailableAuthModule('Google sign-in is not configured on this device.')
  }

  const supabase = createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return createSupabaseGoogleAuthModule(supabase)
}
