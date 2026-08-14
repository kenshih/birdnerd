import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined

/** One browser client owns the persisted Auth session used by Auth and sync RPCs. */
export function getFieldSupabaseClient(): SupabaseClient | undefined {
  if (client) return client
  const url = import.meta.env.VITE_SUPABASE_URL ?? ''
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
  if (!url || !publishableKey) return undefined
  client = createClient(url, publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  return client
}
