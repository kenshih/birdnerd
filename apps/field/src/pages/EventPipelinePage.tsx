import { useEffect, useMemo, useState } from 'react'
import type { EventPipelineDiagnostics } from '../access/workspaceEventStore'
import PageHeader from '../components/PageHeader'
import { useWorkspaceAccess } from '../components/WorkspaceAccessGate'
import { getFieldCollaboration } from '../sync/fieldCollaboration'

export default function EventPipelinePage({ onHome }: { onHome: () => void }) {
  const access = useWorkspaceAccess()
  const { store } = useMemo(getFieldCollaboration, [])
  const [diagnostics, setDiagnostics] = useState<EventPipelineDiagnostics>()
  useEffect(() => { void store.diagnostics(access.workspace_id).then(setDiagnostics) }, [access.workspace_id, store])

  return (
    <main style={styles.page}>
      <PageHeader title="Event Pipeline" onHome={onHome} />
      <p style={styles.note}>Developer-only replica evidence. This view reads the provider-neutral diagnostics Interface and survives reload.</p>
      {!diagnostics ? <p>Loading…</p> : (
        <>
          <section style={styles.card}><h2>Replica state</h2><pre>{JSON.stringify({ metadata: diagnostics.metadata, queue: diagnostics.queue, receipts: diagnostics.receipts }, null, 2)}</pre></section>
          <section style={styles.card}><h2>Projection</h2><pre>{JSON.stringify(diagnostics.projection, null, 2)}</pre></section>
          {diagnostics.commands.map(command => (
            <section key={command.command_id} style={styles.card}>
              <h2>Command {command.command_id}</h2>
              <pre>{JSON.stringify(command.events, null, 2)}</pre>
            </section>
          ))}
        </>
      )}
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100dvh', padding: '1rem 1.25rem 3rem', background: '#101814', color: '#d8f3dc', display: 'flex', flexDirection: 'column', gap: '1rem' },
  note: { margin: 0, color: '#95d5b2' },
  card: { background: '#17231d', border: '1px solid #2d6a4f', borderRadius: 8, padding: '0.8rem', overflow: 'auto' },
}
