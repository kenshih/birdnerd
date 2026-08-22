/** Test-only auth adapter for Playwright's local Vite server; never enabled in production builds. */
import type { AuthModule, AuthState, AuthStateListener } from './authModule'

const signedInState: AuthState = {
  kind: 'signed-in',
  identity: {
    provider: 'google',
    subject: 'playwright-admin',
    email: 'playwright-admin@example.com',
    displayName: 'Playwright Admin',
  },
}

const signedOutState: AuthState = {
  kind: 'signed-out',
  signInActions: [{ id: 'playwright-admin', label: 'Continue as Playwright Admin' }],
}

export function createE2EAuthModule(): AuthModule {
  let state = signedInState
  const listeners = new Set<AuthStateListener>()

  function publish(nextState: AuthState) {
    state = nextState
    listeners.forEach(listener => listener(state))
  }

  return {
    async getState() { return state },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async beginSignIn(actionId) {
      if (actionId === 'playwright-admin') publish(signedInState)
    },
    async signOut() { publish(signedOutState) },
  }
}
