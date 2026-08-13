import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import type { AuthModule, AuthState, ExternalIdentity } from '../auth/authModule'
import type { WorkspaceAccessModule, WorkspaceAccessResult } from '../access/workspaceAccessModule'

type Props = {
  auth: AuthModule
  workspaceAccess: WorkspaceAccessModule
  children: ReactNode
}

type AccessState =
  | { kind: 'checking' }
  | { kind: 'resolved'; result: WorkspaceAccessResult }
  | { kind: 'error'; message: string }

export default function WorkspaceAccessGate({ auth, workspaceAccess, children }: Props) {
  const [authState, setAuthState] = useState<AuthState>({ kind: 'checking' })
  const [accessState, setAccessState] = useState<AccessState>({ kind: 'checking' })

  useEffect(() => {
    let isMounted = true
    const resolve = (identity: ExternalIdentity) => {
      setAccessState({ kind: 'checking' })
      void workspaceAccess.resolve(identity)
        .then(result => { if (isMounted) setAccessState({ kind: 'resolved', result }) })
        .catch(error => {
          if (isMounted) setAccessState({
            kind: 'error',
            message: error instanceof Error ? error.message : 'Could not check BirdNerd access.',
          })
        })
    }
    const applyAuthState = (nextState: AuthState) => {
      if (!isMounted) return
      setAuthState(nextState)
      if (nextState.kind === 'signed-in') resolve(nextState.identity)
    }
    const unsubscribe = auth.subscribe(applyAuthState)
    void auth.getState().then(applyAuthState)

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [auth, workspaceAccess])

  if (authState.kind === 'signed-in') {
    if (accessState.kind === 'checking') return <CheckingAccess />
    if (accessState.kind === 'error') return <AccessProblem message={accessState.message} onSignOut={() => void auth.signOut()} />
    if (accessState.result.kind === 'active') return <>{children}</>
    return <NoAccess identity={authState.identity} onSignOut={() => void auth.signOut()} />
  }

  if (authState.kind === 'checking') return <CheckingAccess />
  if (authState.kind === 'unavailable') return <AccessProblem message={authState.message} />
  if (authState.kind === 'error') return <SignInScreen message={authState.message} onSignIn={() => void auth.beginSignIn()} />
  return <SignInScreen onSignIn={() => void auth.beginSignIn()} />
}

function CheckingAccess() {
  return <Screen><h1>Checking access…</h1><p>BirdNerd is confirming your sign-in and Workspace access.</p></Screen>
}

function SignInScreen({ message, onSignIn }: { message?: string; onSignIn: () => void }) {
  return (
    <Screen>
      <h1>BirdNerd</h1>
      <p>{message ?? 'Sign in with your pre-authorized Google account to continue.'}</p>
      <button style={styles.primaryButton} type="button" onClick={onSignIn}>Continue with Google</button>
    </Screen>
  )
}

function NoAccess({ identity, onSignOut }: { identity: ExternalIdentity; onSignOut: () => void }) {
  return (
    <Screen>
      <h1>You don’t have access to BirdNerd yet</h1>
      <p>{identity.email ?? identity.displayName ?? 'This Google account'} has not been pre-authorized for a BirdNerd Workspace.</p>
      <p>Ask a Workspace Admin to pre-authorize the exact Google email address you use here.</p>
      <button style={styles.secondaryButton} type="button" onClick={onSignOut}>Use another Google account</button>
    </Screen>
  )
}

function AccessProblem({ message, onSignOut }: { message: string; onSignOut?: () => void }) {
  return (
    <Screen>
      <h1>BirdNerd access is unavailable</h1>
      <p>{message}</p>
      {onSignOut && <button style={styles.secondaryButton} type="button" onClick={onSignOut}>Sign out</button>}
    </Screen>
  )
}

function Screen({ children }: { children: ReactNode }) {
  return <main style={styles.page}>{children}</main>
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '2rem 1.5rem', textAlign: 'center', background: 'linear-gradient(160deg, #1b4332 0%, #2d6a4f 60%, #52b788 100%)', color: '#fff',
  },
  primaryButton: { minHeight: '44px', width: 'min(100%, 320px)', border: 'none', borderRadius: '8px', background: '#fff', color: '#1b4332', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { minHeight: '44px', width: 'min(100%, 320px)', border: '1px solid rgba(255,255,255,0.55)', borderRadius: '8px', background: 'transparent', color: '#fff', fontWeight: 700, cursor: 'pointer' },
}
