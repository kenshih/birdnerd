import { useMemo, useState } from 'react'
import { createBrowserSupabaseClient, getSupabaseSettings } from './supabaseClient'

type TestState =
  | { status: 'idle'; message: string }
  | { status: 'checking'; message: string }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string }

function maskSecret(secret: string) {
  if (!secret) return 'Missing'
  if (secret.length <= 12) return 'Configured'
  return `${secret.slice(0, 6)}...${secret.slice(-4)}`
}

export default function App() {
  const settings = useMemo(() => getSupabaseSettings(), [])
  const [testState, setTestState] = useState<TestState>({
    status: 'idle',
    message: 'Ready to test the Supabase client.',
  })

  const isConfigured = Boolean(settings.url && settings.anonKey)

  async function testConnection() {
    if (!isConfigured) {
      setTestState({
        status: 'error',
        message: 'Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then restart the dev server.',
      })
      return
    }

    setTestState({ status: 'checking', message: 'Checking Supabase auth endpoint...' })

    try {
      const supabase = createBrowserSupabaseClient(settings)
      const { data, error } = await supabase.auth.getSession()

      if (error) throw error

      setTestState({
        status: 'success',
        message: data.session
          ? `Connected. Signed in as ${data.session.user.email ?? data.session.user.id}.`
          : 'Connected. No active login session yet.',
      })
    } catch (error) {
      setTestState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Supabase connection failed.',
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

      <section className="panel">
        <div className="panel-heading">
          <h2>Supabase Connection</h2>
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
            <dt>Anon key</dt>
            <dd>{maskSecret(settings.anonKey)}</dd>
          </div>
        </dl>

        <button type="button" onClick={testConnection} disabled={testState.status === 'checking'}>
          {testState.status === 'checking' ? 'Testing...' : 'Test connection'}
        </button>

        <p className={`status ${testState.status}`} role="status">
          {testState.message}
        </p>
      </section>

      <section className="notes">
        <h2>Local setup</h2>
        <pre>{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key`}</pre>
      </section>
    </main>
  )
}
