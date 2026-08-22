// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { AuthModule, AuthState, AuthStateListener } from '../auth/authModule'
import { createLocalFixtureAuthModule, type LocalFixtureProfile } from '../auth/localFixtureAuth'
import { createSupabaseGoogleAuthModule } from '../auth/supabaseGoogleAuth'
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
  renderGateWithAuth(auth, workspaceAccess)
  return auth
}

function renderGateWithAuth(auth: AuthModule, workspaceAccess: WorkspaceAccessModule) {
  render(<WorkspaceAccessGate auth={auth} workspaceAccess={workspaceAccess}><div>Workspace data</div></WorkspaceAccessGate>)
}

function activeAccess(): WorkspaceAccessModule {
  return { resolve: vi.fn().mockResolvedValue({ kind: 'active', access: {
    workspace_id: 'workspace', workspace_name: 'Fixture Workspace', membership_id: 'membership', role: 'admin', user_account_id: 'user',
  } }) }
}

function signedInSupabasePort(session: Session) {
  let listener: ((event: AuthChangeEvent, nextSession: Session | null) => void) | undefined
  return {
    port: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
        onAuthStateChange: vi.fn().mockImplementation(nextListener => {
          listener = nextListener
          return { data: { subscription: { unsubscribe: vi.fn() } } }
        }),
        signOut: vi.fn().mockImplementation(async () => {
          listener?.('SIGNED_OUT', null)
          return { error: null }
        }),
        signInWithPassword: vi.fn(),
        signInWithOAuth: vi.fn(),
      },
    },
  }
}

const fixtureProfiles: readonly LocalFixtureProfile[] = [
  { id: 'fixture-admin', label: 'Continue as Fixture Admin', email: 'fixture-admin@birdnerd.test', password: 'fixture-admin-local-only' },
  { id: 'fixture-contributor', label: 'Continue as Fixture Contributor', email: 'fixture-contributor@birdnerd.test', password: 'fixture-contributor-local-only' },
]

const fixtureSession = {
  user: {
    id: 'local-fixture-admin', email: 'fixture-admin@birdnerd.test', app_metadata: { provider: 'email' }, user_metadata: {},
    identities: [{ provider: 'google', identity_data: { sub: 'fixture-admin' } }],
  },
} as unknown as Session

const googleSession = {
  user: {
    id: 'hosted-google-user', email: 'bander@example.com', app_metadata: { provider: 'google' }, user_metadata: { full_name: 'Bander Example' },
    identities: [{ provider: 'google', identity_data: { sub: 'hosted-google-subject' } }],
  },
} as unknown as Session

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
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(auth.signOut).toHaveBeenCalledOnce()
  })

  it('shows the active hosted identity and delegates sign-out through the Auth Module', async () => {
    const auth = renderGate(
      { kind: 'signed-in', identity: { provider: 'google', subject: 'authorized', email: 'bander@example.com', displayName: 'Bander Example' } },
      { resolve: vi.fn().mockResolvedValue({ kind: 'active', access: {
        workspace_id: 'workspace', workspace_name: 'Cedar Creek', membership_id: 'membership', role: 'admin', user_account_id: 'user',
      } }) },
    )

    expect(await screen.findByText('Workspace data')).toBeVisible()
    expect(screen.getByLabelText('Signed-in account')).toHaveTextContent('Bander Example · bander@example.com')
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(auth.signOut).toHaveBeenCalledOnce()
  })

  it('shows a fixture identity without exposing fixture credentials', async () => {
    renderGate(
      { kind: 'signed-in', identity: { provider: 'google', subject: 'fixture-contributor', email: 'fixture-contributor@birdnerd.test' } },
      { resolve: vi.fn().mockResolvedValue({ kind: 'active', access: {
        workspace_id: 'workspace', workspace_name: 'Fixture Workspace', membership_id: 'membership', role: 'contributor', user_account_id: 'user',
      } }) },
    )

    expect(await screen.findByLabelText('Signed-in account')).toHaveTextContent('fixture-contributor@birdnerd.test')
    expect(screen.queryByText('fixture-contributor-local-only')).not.toBeInTheDocument()
  })

  it('returns the local fixture adapter to its declared sign-in choices after sign-out', async () => {
    const { port } = signedInSupabasePort(fixtureSession)
    renderGateWithAuth(createLocalFixtureAuthModule(port, fixtureProfiles), activeAccess())

    expect(await screen.findByLabelText('Signed-in account')).toHaveTextContent('fixture-admin@birdnerd.test')
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('button', { name: 'Continue as Fixture Admin' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Continue as Fixture Contributor' })).toBeVisible()
    expect(screen.queryByText('Workspace data')).not.toBeInTheDocument()
  })

  it('returns the mocked hosted Google adapter to Google sign-in after sign-out', async () => {
    const { port } = signedInSupabasePort(googleSession)
    renderGateWithAuth(createSupabaseGoogleAuthModule(port), activeAccess())

    expect(await screen.findByLabelText('Signed-in account')).toHaveTextContent('Bander Example · bander@example.com')
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('button', { name: 'Continue with Google' })).toBeVisible()
    expect(screen.queryByText('Workspace data')).not.toBeInTheDocument()
  })
})
