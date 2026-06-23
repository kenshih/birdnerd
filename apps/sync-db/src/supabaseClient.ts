import { createClient } from '@supabase/supabase-js'

export type SupabaseSettings = {
  url: string
  anonKey: string
}

export function getSupabaseSettings(): SupabaseSettings {
  return {
    url: import.meta.env.VITE_SUPABASE_URL ?? '',
    anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
  }
}

export function createBrowserSupabaseClient(settings: SupabaseSettings) {
  return createClient(settings.url, settings.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}
