import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { AuthModule, AuthSignInAction, AuthState, AuthStateListener, ExternalIdentity } from './authModule'

/** The session lifecycle surface both concrete Supabase sign-in adapters need. */
export type SupabaseSessionPort = {
  auth: {
    getSession(): Promise<{ data: { session: Session | null }; error: Error | null }>
    onAuthStateChange(listener: (event: AuthChangeEvent, session: Session | null) => void): {
      data: { subscription: { unsubscribe(): void } }
    }
    signOut(): Promise<{ error: Error | null }>
  }
}

/**
 * A concrete Supabase sign-in role. The session Module owns restoration,
 * session changes, identity mapping, error state, and sign-out; this Adapter
 * owns only its labelled interaction.
 */
export type SupabaseSignInAdapter = {
  signInActions: readonly AuthSignInAction[]
  beginSignIn(actionId: string): Promise<{ error: Error | null }>
  onSignedIn?(): void
}

/** Maps a Supabase session to BirdNerd's external identity without granting access. */
export function externalIdentityFromSupabaseSession(session: Session): ExternalIdentity {
  const googleIdentity = session.user.identities?.find(candidate => candidate.provider === 'google')
  const provider = googleIdentity?.provider ?? (typeof session.user.app_metadata.provider === 'string'
    ? session.user.app_metadata.provider
    : 'google')
  const identityData = googleIdentity?.identity_data as Record<string, unknown> | undefined

  return {
    provider,
    subject: typeof identityData?.sub === 'string' ? identityData.sub : session.user.id,
    email: session.user.email ?? undefined,
    displayName: typeof session.user.user_metadata.full_name === 'string'
      ? session.user.user_metadata.full_name
      : undefined,
  }
}

/**
 * Shared Supabase-session Module behind Field's provider-neutral Auth seam.
 * Its sign-in Adapter must expose every selectable action; unknown action IDs
 * become a recoverable Auth error rather than reaching an Auth provider.
 */
export function createSupabaseSessionAuthModule(
  supabase: SupabaseSessionPort,
  signInAdapter: SupabaseSignInAdapter,
): AuthModule {
  let state: AuthState = { kind: 'checking' }
  let started = false
  const listeners = new Set<AuthStateListener>()

  const signedOut = (): AuthState => ({ kind: 'signed-out', signInActions: signInAdapter.signInActions })
  const errorState = (message: string): AuthState => ({ kind: 'error', message, signInActions: signInAdapter.signInActions })

  function publish(nextState: AuthState) {
    state = nextState
    listeners.forEach(listener => listener(state))
  }

  function applySession(session: Session | null) {
    publish(session ? { kind: 'signed-in', identity: externalIdentityFromSupabaseSession(session) } : signedOut())
    if (session) signInAdapter.onSignedIn?.()
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
      publish(errorState(error.message))
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
    async beginSignIn(actionId) {
      await start()
      if (!signInAdapter.signInActions.some(action => action.id === actionId)) {
        publish(errorState('The selected sign-in method is unavailable.'))
        return
      }
      try {
        const { error } = await signInAdapter.beginSignIn(actionId)
        if (error) publish(errorState(error.message))
      } catch (error) {
        publish(errorState(error instanceof Error ? error.message : 'Could not start sign-in.'))
      }
    },
    async signOut() {
      await start()
      const { error } = await supabase.auth.signOut()
      if (error) publish(errorState(error.message))
    },
  }
}
