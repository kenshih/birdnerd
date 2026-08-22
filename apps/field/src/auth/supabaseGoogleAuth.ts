import type { AuthModule, AuthSignInAction } from './authModule'
import { createSupabaseSessionAuthModule, type SupabaseSessionPort, type SupabaseSignInAdapter } from './supabaseSessionAuth'

type SupabaseGoogleAuthPort = SupabaseSessionPort & {
  auth: SupabaseSessionPort['auth'] & {
    signInWithOAuth(options: {
      provider: 'google'
      options: { redirectTo: string; scopes: string }
    }): Promise<{ error: Error | null }>
  }
}

type BrowserPort = {
  location: Pick<Location, 'origin' | 'pathname' | 'search' | 'hash'>
  history: Pick<History, 'state' | 'replaceState'>
  title: () => string
  basePath: string
}

function browserPort(): BrowserPort {
  return {
    location: window.location,
    history: window.history,
    title: () => document.title,
    basePath: import.meta.env.BASE_URL,
  }
}

function clearOAuthCallbackFragment(browser: BrowserPort) {
  const callback = new URLSearchParams(browser.location.hash.slice(1))
  if (!callback.has('access_token') || !callback.has('refresh_token')) return

  browser.history.replaceState(
    browser.history.state,
    browser.title(),
    `${browser.location.pathname}${browser.location.search}`,
  )
}

const googleSignInActions: readonly AuthSignInAction[] = [{ id: 'google', label: 'Continue with Google' }]

/** Google interaction Adapter for the shared Supabase-session Module. */
export function createGoogleSignInAdapter(
  supabase: SupabaseGoogleAuthPort,
  browser = browserPort(),
): SupabaseSignInAdapter {
  return {
    signInActions: googleSignInActions,
    async beginSignIn(actionId) {
      if (actionId !== 'google') return { error: new Error('The selected sign-in method is unavailable.') }
      const redirectTo = new URL(browser.basePath, browser.location.origin).toString()
      return supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, scopes: 'openid email profile' },
      })
    },
    onSignedIn() {
      clearOAuthCallbackFragment(browser)
    },
  }
}

/** Supabase/Google Adapter for Field's provider-neutral Auth Module Interface. */
export function createSupabaseGoogleAuthModule(
  supabase: SupabaseGoogleAuthPort,
  browser = browserPort(),
): AuthModule {
  return createSupabaseSessionAuthModule(supabase, createGoogleSignInAdapter(supabase, browser))
}
