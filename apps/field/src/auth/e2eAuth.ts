/** Test-only auth adapter for Playwright's local Vite server; never enabled in production builds. */
import type { AuthModule, AuthState, AuthStateListener } from './authModule'

const state: AuthState = {
  kind: 'signed-in',
  identity: {
    provider: 'google',
    subject: 'playwright-admin',
    email: 'playwright-admin@example.com',
    displayName: 'Playwright Admin',
  },
}

export function createE2EAuthModule(): AuthModule {
  return {
    async getState() { return state },
    subscribe(_listener: AuthStateListener) { return () => {} },
    async beginSignIn(_actionId: string) {},
    async signOut() {},
  }
}
