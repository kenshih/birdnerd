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
