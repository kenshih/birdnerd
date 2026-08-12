/**
 * Field authentication seam.
 *
 * UI callers may depend only on the types and `AuthModule` interface in this
 * file. Keep Supabase, Google, browser callback, and build-configuration
 * details inside an adapter such as `supabaseGoogleAuth.ts`; keep BirdNerd User
 * Account and Workspace Membership authorization in separate modules.
 *
 * Maintain adapter unit tests for identity mapping, sign-in redirect, session
 * changes, errors, and callback cleanup. Maintain `AuthStatus` component tests
 * with an in-memory AuthModule fake for each UI state and user action.
 */
export type ExternalIdentity = {
  provider: string
  subject: string
  email?: string
  displayName?: string
}

export type AuthState =
  | { kind: 'checking' }
  | { kind: 'signed-out' }
  | { kind: 'signed-in'; identity: ExternalIdentity }
  | { kind: 'unavailable'; message: string }
  | { kind: 'error'; message: string }

export type AuthStateListener = (state: AuthState) => void

/**
 * Field's authentication seam. It establishes an external identity only;
 * BirdNerd User Account and Workspace Membership authorization remain outside
 * this module.
 */
export interface AuthModule {
  getState(): Promise<AuthState>
  subscribe(listener: AuthStateListener): () => void
  beginSignIn(): Promise<void>
  signOut(): Promise<void>
}

export function createUnavailableAuthModule(message: string): AuthModule {
  const state: AuthState = { kind: 'unavailable', message }

  return {
    async getState() { return state },
    subscribe() { return () => {} },
    async beginSignIn() {},
    async signOut() {},
  }
}
