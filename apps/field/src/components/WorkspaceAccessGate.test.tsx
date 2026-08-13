// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthModule, AuthState, AuthStateListener } from '../auth/authModule'
import type { WorkspaceAccessModule } from '../access/workspaceAccessModule'
import WorkspaceAccessGate from './WorkspaceAccessGate'

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
}

function renderGate(authState: AuthState, workspaceAccess: WorkspaceAccessModule) {
  const auth = new FakeAuthModule(authState)
  render(<WorkspaceAccessGate auth={auth} workspaceAccess={workspaceAccess}><div>Workspace data</div></WorkspaceAccessGate>)
  return auth
}

describe('WorkspaceAccessGate', () => {
  it('offers Google sign-in before showing any Workspace content', async () => {
    const auth = renderGate({ kind: 'signed-out' }, { resolve: vi.fn() })

    fireEvent.click(await screen.findByRole('button', { name: 'Continue with Google' }))
    expect(auth.beginSignIn).toHaveBeenCalledOnce()
    expect(screen.queryByText('Workspace data')).not.toBeInTheDocument()
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
