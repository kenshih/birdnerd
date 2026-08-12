import { useEffect, useState } from 'react'
import type { AuthModule, AuthState } from '../auth/authModule'

type Props = { auth: AuthModule }

export default function AuthStatus({ auth }: Props) {
  const [state, setState] = useState<AuthState>({ kind: 'checking' })

  useEffect(() => {
    let isMounted = true
    const unsubscribe = auth.subscribe(nextState => {
      if (isMounted) setState(nextState)
    })

    void auth.getState().then(nextState => {
      if (isMounted) setState(nextState)
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [auth])

  const isSignedIn = state.kind === 'signed-in'
  const canSignIn = state.kind === 'signed-out' || state.kind === 'error'
  const message = state.kind === 'signed-in'
    ? state.identity.email ?? state.identity.displayName ?? 'Signed in.'
    : state.kind === 'checking'
      ? 'Checking sign-in status…'
      : state.kind === 'signed-out'
        ? 'Not signed in.'
        : state.message

  return (
    <section style={styles.panel} aria-label="Google sign-in">
      <div style={styles.heading}>
        <span style={styles.label}>Google sign-in</span>
        <span style={isSignedIn ? styles.signedIn : styles.signedOut}>
          {isSignedIn ? 'Signed in' : 'Test mode'}
        </span>
      </div>
      <p style={styles.message}>{message}</p>
      {isSignedIn ? (
        <button style={styles.secondaryButton} type="button" onClick={() => void auth.signOut()}>
          Sign out
        </button>
      ) : (
        <button
          style={canSignIn ? styles.primaryButton : styles.disabledButton}
          type="button"
          onClick={() => void auth.beginSignIn()}
          disabled={!canSignIn}
        >
          {state.kind === 'checking' ? 'Checking…' : 'Continue with Google'}
        </button>
      )}
      <p style={styles.note}>This verifies authentication only. Workspace access and identity linkage follow.</p>
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: { width: '100%', maxWidth: '400px', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', padding: '1rem', backdropFilter: 'blur(4px)' },
  heading: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' },
  label: { fontSize: '0.9rem', fontWeight: 600 },
  signedIn: { background: '#d8f3dc', color: '#1b4332', borderRadius: '999px', padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 700 },
  signedOut: { background: 'rgba(255,255,255,0.16)', borderRadius: '999px', padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 700 },
  message: { margin: '0.6rem 0 0.75rem', fontSize: '0.85rem', overflowWrap: 'anywhere' },
  primaryButton: { width: '100%', minHeight: '44px', border: 'none', borderRadius: '8px', background: '#fff', color: '#1b4332', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { width: '100%', minHeight: '44px', border: '1px solid rgba(255,255,255,0.55)', borderRadius: '8px', background: 'transparent', color: '#fff', fontWeight: 700, cursor: 'pointer' },
  disabledButton: { width: '100%', minHeight: '44px', border: 'none', borderRadius: '8px', background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.65)', fontWeight: 700 },
  note: { margin: '0.75rem 0 0', fontSize: '0.72rem', lineHeight: 1.4, opacity: 0.75 },
}
