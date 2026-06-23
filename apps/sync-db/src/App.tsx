import { useMemo, useState } from 'react'
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

function maskSecret(secret: string) {
  if (!secret) return 'Missing'
  if (secret.length <= 12) return 'Configured'
  return `${secret.slice(0, 6)}...${secret.slice(-4)}`
}

export default function App() {
  const settings = useMemo(() => getSupabaseSettings(), [])
  const [testState, setTestState] = useState<TestState>({
    status: 'idle',
    message: 'Ready to load rows from test_table.',
  })
  const [rows, setRows] = useState<TestTableRow[]>([])

  const isConfigured = Boolean(settings.url && settings.anonKey)

  async function loadRows() {
    if (!isConfigured) {
      setTestState({
        status: 'error',
        message: 'Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then restart the dev server.',
      })
      return
    }

    setTestState({ status: 'checking', message: 'Loading first 5 rows from test_table...' })

    try {
      const supabase = createBrowserSupabaseClient(settings)
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

      <section className="panel">
        <div className="panel-heading">
          <h2>Supabase Table Test</h2>
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
