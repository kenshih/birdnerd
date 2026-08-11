import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../auth/supabaseClient'

export default function AuthStatus() {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('Checking sign-in status…')

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false)
      setMessage('Google sign-in is not configured on this device.')
      return
    }

    let isMounted = true

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return
      setSession(data.session)
      setIsLoading(false)
      setMessage(error?.message ?? (data.session ? 'Signed in with Google.' : 'Not signed in.'))
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return
      setSession(nextSession)
      setIsLoading(false)
      setMessage(nextSession ? 'Signed in with Google.' : 'Not signed in.')
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function signInWithGoogle() {
    if (!supabase) return

    setIsLoading(true)
    setMessage('Opening Google sign-in…')
    const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        scopes: 'openid email profile',
      },
    })

    if (error) {
      setIsLoading(false)
      setMessage(error.message)
    }
  }

  async function signOut() {
    if (!supabase) return

    setIsLoading(true)
    const { error } = await supabase.auth.signOut()
    setIsLoading(false)
    setMessage(error ? error.message : 'Signed out.')
  }

  const email = session?.user.email

  return (
    <section style={styles.panel} aria-label="Google sign-in">
      <div style={styles.heading}>
        <span style={styles.label}>Google sign-in</span>
        <span style={session ? styles.signedIn : styles.signedOut}>
          {session ? 'Signed in' : 'Test mode'}
        </span>
      </div>
      <p style={styles.message}>{email ?? message}</p>
      {session ? (
        <button style={styles.secondaryButton} type="button" onClick={() => void signOut()} disabled={isLoading}>
          Sign out
        </button>
      ) : (
        <button
          style={isSupabaseConfigured ? styles.primaryButton : styles.disabledButton}
          type="button"
          onClick={() => void signInWithGoogle()}
          disabled={!isSupabaseConfigured || isLoading}
        >
          {isLoading ? 'Checking…' : 'Continue with Google'}
        </button>
      )}
      <p style={styles.note}>This verifies authentication only. Workspace access and identity linkage follow.</p>
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: '100%',
    maxWidth: '400px',
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '10px',
    padding: '1rem',
    backdropFilter: 'blur(4px)',
  },
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
