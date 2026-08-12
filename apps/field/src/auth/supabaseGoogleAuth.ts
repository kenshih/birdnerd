import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { AuthModule, AuthState, AuthStateListener, ExternalIdentity } from './authModule'

type SupabaseAuthPort = {
  auth: {
    getSession(): Promise<{ data: { session: Session | null }; error: Error | null }>
    onAuthStateChange(listener: (event: AuthChangeEvent, session: Session | null) => void): {
      data: { subscription: { unsubscribe(): void } }
    }
    signInWithOAuth(options: {
      provider: 'google'
      options: { redirectTo: string; scopes: string }
    }): Promise<{ error: Error | null }>
    signOut(): Promise<{ error: Error | null }>
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

function identityFrom(session: Session): ExternalIdentity {
  const provider = typeof session.user.app_metadata.provider === 'string'
    ? session.user.app_metadata.provider
    : 'google'
  const identity = session.user.identities?.find(candidate => candidate.provider === provider)
  const identityData = identity?.identity_data as Record<string, unknown> | undefined

  return {
    provider,
    subject: typeof identityData?.sub === 'string' ? identityData.sub : session.user.id,
    email: session.user.email ?? undefined,
    displayName: typeof session.user.user_metadata.full_name === 'string'
      ? session.user.user_metadata.full_name
      : undefined,
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

/** Supabase/Google adapter for Field's provider-neutral AuthModule interface. */
export function createSupabaseGoogleAuthModule(
  supabase: SupabaseAuthPort,
  browser = browserPort(),
): AuthModule {
  let state: AuthState = { kind: 'checking' }
  let started = false
  const listeners = new Set<AuthStateListener>()

  function publish(nextState: AuthState) {
    state = nextState
    listeners.forEach(listener => listener(state))
  }

  function applySession(session: Session | null) {
    publish(session ? { kind: 'signed-in', identity: identityFrom(session) } : { kind: 'signed-out' })
    if (session) clearOAuthCallbackFragment(browser)
  }

  async function start() {
    if (started) return
    started = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => applySession(session))

    const { data, error } = await supabase.auth.getSession()
    if (error) {
      subscription.unsubscribe()
      publish({ kind: 'error', message: error.message })
      return
    }
    applySession(data.session)
  }

  return {
    async getState() {
      await start()
      return state
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async beginSignIn() {
      const redirectTo = new URL(browser.basePath, browser.location.origin).toString()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, scopes: 'openid email profile' },
      })
      if (error) publish({ kind: 'error', message: error.message })
    },
    async signOut() {
      const { error } = await supabase.auth.signOut()
      if (error) publish({ kind: 'error', message: error.message })
    },
  }
}
