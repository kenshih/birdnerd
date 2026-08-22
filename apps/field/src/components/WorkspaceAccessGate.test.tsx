// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthModule, AuthState, AuthStateListener } from '../auth/authModule'
import type { WorkspaceAccessModule } from '../access/workspaceAccessModule'
import WorkspaceAccessGate from './WorkspaceAccessGate'

afterEach(cleanup)

class FakeAuthModule implements AuthModule {
  private listeners = new Set<AuthStateListener>()
  beginSignIn = vi.fn(async (_actionId: string) => {})
  signOut = vi.fn(async () => {})

  constructor(private state: AuthState) {}

  async getState() { return this.state }
  subscribe(listener: AuthStateListener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

function renderGate(authState: AuthState, workspaceAccess: WorkspaceAccessModule) {
  const auth = new FakeAuthModule(authState)
  render(<WorkspaceAccessGate auth={auth} workspaceAccess={workspaceAccess}><div>Workspace data</div></WorkspaceAccessGate>)
  return auth
}

describe('WorkspaceAccessGate', () => {
  it('offers Google sign-in before showing any Workspace content', async () => {
    const auth = renderGate({ kind: 'signed-out', signInActions: [{ id: 'google', label: 'Continue with Google' }] }, { resolve: vi.fn() })

    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }))
    expect(auth.beginSignIn).toHaveBeenCalledWith('google')
    expect(screen.queryByText('Workspace data')).not.toBeInTheDocument()
  })

  it('offers both local fixture actions and keeps provider IDs out of the caller', async () => {
    const auth = renderGate({
      kind: 'signed-out',
      signInActions: [
        { id: 'fixture-admin', label: 'Continue as Fixture Admin' },
        { id: 'fixture-contributor', label: 'Continue as Fixture Contributor' },
      ],
    }, { resolve: vi.fn() })

    fireEvent.click(await screen.findByRole('button', { name: 'Continue as Fixture Admin' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue as Fixture Contributor' }))

    expect(auth.beginSignIn).toHaveBeenNthCalledWith(1, 'fixture-admin')
    expect(auth.beginSignIn).toHaveBeenNthCalledWith(2, 'fixture-contributor')
    expect(screen.queryByText('Workspace data')).not.toBeInTheDocument()
  })

  it('keeps a recoverable sign-in error alongside its available actions', async () => {
    const auth = renderGate({
      kind: 'error',
      message: 'Fixture session expired.',
      signInActions: [{ id: 'fixture-admin', label: 'Continue as Fixture Admin' }],
    }, { resolve: vi.fn() })

    expect(await screen.findByText('Fixture session expired.')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Continue as Fixture Admin' }))
    expect(auth.beginSignIn).toHaveBeenCalledWith('fixture-admin')
  })

  it('shows the signed-in email on the no-access screen without rendering Workspace content', async () => {
    const auth = renderGate(
      { kind: 'signed-in', identity: { provider: 'google', subject: 'not-authorized', email: 'outside@example.com' } },
      { resolve: vi.fn().mockResolvedValue({ kind: 'no-access' }) },
    )

    expect(await screen.findByText('You don’t have access to BirdNerd yet')).toBeVisible()
    expect(screen.getByText(/outside@example.com/)).toBeVisible()
    expect(screen.queryByText('Workspace data')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Use another Google account' }))
    expect(auth.signOut).toHaveBeenCalledOnce()
  })

  it('renders Workspace content only after active access resolves', async () => {
    renderGate(
      { kind: 'signed-in', identity: { provider: 'google', subject: 'authorized', email: 'bander@example.com' } },
      { resolve: vi.fn().mockResolvedValue({ kind: 'active', access: {
        workspace_id: 'workspace', workspace_name: 'Cedar Creek', membership_id: 'membership', role: 'admin', user_account_id: 'user',
      } }) },
    )

    expect(await screen.findByText('Workspace data')).toBeVisible()
  })
})
