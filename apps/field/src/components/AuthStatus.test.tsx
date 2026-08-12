// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthModule, AuthState, AuthStateListener } from '../auth/authModule'
import AuthStatus from './AuthStatus'

afterEach(cleanup)

class FakeAuthModule implements AuthModule {
  private listeners = new Set<AuthStateListener>()
  beginSignIn = vi.fn(async () => {})
  signOut = vi.fn(async () => {})

  constructor(private state: AuthState) {}

  async getState() { return this.state }

  subscribe(listener: AuthStateListener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  emit(nextState: AuthState) {
    this.state = nextState
    this.listeners.forEach(listener => listener(nextState))
  }
}

describe('AuthStatus', () => {
  it('renders a signed-out state and begins sign-in through the AuthModule interface', async () => {
    const auth = new FakeAuthModule({ kind: 'signed-out' })
    render(<AuthStatus auth={auth} />)

    const signIn = await screen.findByRole('button', { name: 'Continue with Google' })
    fireEvent.click(signIn)

    expect(auth.beginSignIn).toHaveBeenCalledOnce()
    expect(screen.getByText('Not signed in.')).toBeVisible()
  })

  it('renders an identity received after subscription and signs out through the AuthModule interface', async () => {
    const auth = new FakeAuthModule({ kind: 'signed-out' })
    render(<AuthStatus auth={auth} />)
    await screen.findByText('Not signed in.')

    auth.emit({
      kind: 'signed-in',
      identity: { provider: 'test', subject: 'test-user', email: 'bander@example.com' },
    })

    const signOut = await screen.findByRole('button', { name: 'Sign out' })
    expect(screen.getByText('bander@example.com')).toBeVisible()
    fireEvent.click(signOut)
    expect(auth.signOut).toHaveBeenCalledOnce()
  })

  it('renders an unavailable auth adapter without offering sign-in', async () => {
    const auth = new FakeAuthModule({ kind: 'unavailable', message: 'Google sign-in is not configured on this device.' })
    render(<AuthStatus auth={auth} />)

    expect(await screen.findByText('Google sign-in is not configured on this device.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeDisabled()
  })
})
