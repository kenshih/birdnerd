import { type FormEvent, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { createBrowserSupabaseClient, getSupabaseSettings } from './supabaseClient'

type TestState =
  | { status: 'idle'; message: string }
  | { status: 'checking'; message: string }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }

type TestTableRow = {
  id: string
  created_at: string
  readable_text: string | null
}

type AuthMode = 'sign-in' | 'reset-request' | 'set-password'

function maskSecret(secret: string) {
  if (!secret) return 'Missing'
  if (secret.length <= 12) return 'Configured'
  return `${secret.slice(0, 6)}...${secret.slice(-4)}`
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export default function App() {
  const settings = useMemo(() => getSupabaseSettings(), [])
  const isConfigured = Boolean(settings.url && settings.anonKey)
  const supabase = useMemo(
    () => (isConfigured ? createBrowserSupabaseClient(settings) : null),
    [isConfigured, settings]
  )
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('Checking login session...')
  const [testState, setTestState] = useState<TestState>({
    status: 'idle',
    message: 'Ready to load rows from test_table.',
  })
  const [rows, setRows] = useState<TestTableRow[]>([])
  const canSubmitEmail = isConfigured && isValidEmail(email)

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      setAuthMessage('Supabase env vars are not configured.')
      return
    }

    let isMounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return

      setSession(data.session)
      setAuthLoading(false)
      setAuthMessage(error?.message ?? (data.session ? 'Signed in.' : 'Not signed in.'))
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setAuthLoading(false)
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('set-password')
        setAuthMessage('Enter a new password to finish recovery.')
        return
      }

      setAuthMessage(nextSession ? 'Signed in.' : 'Not signed in.')
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase])

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!supabase) {
      setAuthMessage('Add Supabase env vars, then restart the dev server.')
      return
    }

    setAuthLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    setAuthLoading(false)
    setAuthMessage(error ? error.message : 'Check your email for the login link.')
  }

  async function sendPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!supabase) {
      setAuthMessage('Add Supabase env vars, then restart the dev server.')
      return
    }

    setAuthLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })

    setAuthLoading(false)
    setAuthMessage(error ? error.message : 'Check your email for the password reset link.')
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!supabase) {
      setAuthMessage('Add Supabase env vars, then restart the dev server.')
      return
    }

    setAuthLoading(true)
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    setAuthLoading(false)
    if (error) {
      setAuthMessage(error.message)
      return
    }

    setNewPassword('')
    setAuthMode('sign-in')
    setAuthMessage('Password updated. You are signed in.')
  }

  async function changeSignedInPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!supabase) {
      setAuthMessage('Add Supabase env vars, then restart the dev server.')
      return
    }

    setAuthLoading(true)
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    setAuthLoading(false)
    if (error) {
      setAuthMessage(error.message)
      return
    }

    setNewPassword('')
    setAuthMessage('Password updated.')
  }

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!supabase) {
      setAuthMessage('Add Supabase env vars, then restart the dev server.')
      return
    }

    setAuthLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setAuthLoading(false)
    if (error) {
      setAuthMessage(error.message)
      return
    }

    setPassword('')
    setAuthMessage('Signed in.')
  }

  async function signOut() {
    if (!supabase) return

    setAuthLoading(true)
    const { error } = await supabase.auth.signOut()
    setAuthLoading(false)
    setAuthMessage(error ? error.message : 'Signed out.')
    setRows([])
    setAuthMode('sign-in')
  }

  async function loadRows() {
    if (!supabase) {
      setTestState({
        status: 'error',
        message: 'Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then restart the dev server.',
      })
      return
    }

    setTestState({ status: 'checking', message: 'Loading first 5 rows from test_table...' })

    try {
      const { data, error } = await supabase
        .from('test_table')
        .select('id, created_at, readable_text')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error

      const nextRows = data ?? []
      setRows(nextRows)
      setTestState({
        status: 'success',
        message:
          nextRows.length === 1
            ? 'Loaded 1 row from test_table.'
            : `Loaded ${nextRows.length} rows from test_table.`,
      })
    } catch (error) {
      setRows([])
      setTestState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Could not load test_table rows.',
      })
    }
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">BirdNerd Lab</p>
          <h1>Sync DB</h1>
        </div>
        <span className="version">v{__APP_VERSION__}</span>
      </header>

      <section className="notice">
        <p>
          Basic sync database test for checking Supabase login, password setup, and reading sample rows.
          This is a temporary testing surface, not the field app.
        </p>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Supabase Auth</h2>
          <span className={isConfigured ? 'pill ok' : 'pill warn'}>
            {isConfigured ? 'Configured' : 'Needs env'}
          </span>
        </div>

        <dl className="settings-list">
          <div>
            <dt>Project URL</dt>
            <dd>{settings.url || 'Missing VITE_SUPABASE_URL'}</dd>
          </div>
          <div>
            <dt>Publishable key</dt>
            <dd>{maskSecret(settings.anonKey)}</dd>
          </div>
        </dl>

        {authMode === 'set-password' ? (
          <form className="auth-form" onSubmit={updatePassword}>
            <label htmlFor="new-password">New password</label>
            <div className="input-row">
              <input
                id="new-password"
                name="new-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="New password"
              />
              <button type="submit" disabled={authLoading || !isConfigured}>
                {authLoading ? 'Saving...' : 'Set password'}
              </button>
            </div>
          </form>
        ) : session ? (
          <div className="auth-forms">
            <div className="auth-box">
              <div>
                <p className="label">Signed in as</p>
                <p className="user-email">{session.user.email ?? session.user.id}</p>
              </div>
              <button type="button" className="secondary-button" onClick={signOut} disabled={authLoading}>
                Sign out
              </button>
            </div>

            <form className="auth-form" onSubmit={changeSignedInPassword}>
              <label htmlFor="change-password">Change password</label>
              <div className="input-row">
                <input
                  id="change-password"
                  name="change-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="New password"
                />
                <button type="submit" disabled={authLoading || !isConfigured}>
                  {authLoading ? 'Saving...' : 'Update'}
                </button>
              </div>
            </form>
          </div>
        ) : authMode === 'reset-request' ? (
          <div className="auth-forms">
            <form className="auth-form" onSubmit={sendPasswordReset}>
              <label htmlFor="reset-email">Email</label>
              <div className="input-row">
                <input
                  id="reset-email"
                  name="reset-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
                <button type="submit" disabled={authLoading || !canSubmitEmail}>
                  {authLoading ? 'Sending...' : 'Send reset'}
                </button>
              </div>
            </form>

            <button type="button" className="text-button" onClick={() => setAuthMode('sign-in')}>
              Back to sign in
            </button>
          </div>
        ) : (
          <div className="auth-forms">
            <form className="auth-form" onSubmit={signInWithPassword}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
              <label htmlFor="password">Password</label>
              <div className="input-row">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                />
                <button type="submit" disabled={authLoading || !isConfigured}>
                  {authLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </form>

            <form className="auth-form compact-form" onSubmit={sendMagicLink}>
              <button type="submit" className="secondary-button" disabled={authLoading || !canSubmitEmail}>
                Send magic link
              </button>
            </form>

            <button type="button" className="text-button" onClick={() => setAuthMode('reset-request')}>
              Reset password
            </button>
          </div>
        )}

        <p className="status idle" role="status">
          {authMessage}
        </p>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h2>Supabase Table Test</h2>
          <span className={session ? 'pill ok' : 'pill warn'}>
            {session ? 'Authenticated' : 'Anonymous'}
          </span>
        </div>

        <button type="button" onClick={loadRows} disabled={testState.status === 'checking'}>
          {testState.status === 'checking' ? 'Loading...' : 'Load first 5 rows'}
        </button>

        <p className={`status ${testState.status}`} role="status">
          {testState.message}
        </p>

        <div className="table-wrap" aria-live="polite">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Created</th>
                <th>Text</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{new Date(row.created_at).toLocaleString()}</td>
                    <td>{row.readable_text || <span className="muted">Empty</span>}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="empty-row">
                    No rows loaded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="notes">
        <h2>Local setup</h2>
        <pre>{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key`}</pre>
      </section>
    </main>
  )
}
