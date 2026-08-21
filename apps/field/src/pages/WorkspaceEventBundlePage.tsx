import { useRef, useState, type ChangeEvent } from 'react'
import PageHeader from '../components/PageHeader'
import { useWorkspaceAccess } from '../components/WorkspaceAccessGate'
import { getFieldCollaboration } from '../sync/fieldCollaboration'
import {
  createWorkspaceEventBundle,
  downloadWorkspaceEventBundle,
  parseWorkspaceEventBundle,
} from '../utils/eventBundle'

interface Props {
  onHome: () => void
}

export default function WorkspaceEventBundlePage({ onHome }: Props) {
  const access = useWorkspaceAccess()
  const { store, sync } = getFieldCollaboration()
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)

  async function exportBundle() {
    try {
      const events = await store.exportWorkspaceEvents(access.workspace_id)
      const bundle = await createWorkspaceEventBundle(access.workspace_id, events)
      downloadWorkspaceEventBundle(bundle)
      setStatus(`Exported ${bundle.events.length} immutable Workspace Events.`)
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : 'Failed to export the Workspace Event Bundle.')
    }
  }

  async function restoreBundle(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''

    try {
      const bundle = await parseWorkspaceEventBundle(await file.text())
      if (bundle.manifest.workspace_id !== access.workspace_id) {
        throw new Error('This Bundle belongs to another Workspace or you no longer have active access to it.')
      }

      const pending = (await store.diagnostics(access.workspace_id)).queue
        .filter(item => item.status === 'pending').length
      const confirmed = confirm(
        `Restore ${bundle.events.length} immutable Events for ${access.workspace_name}?\n\n`
        + `${pending} unsynced local Event${pending === 1 ? '' : 's'} will be protected and returned to the outbound queue. `
        + 'The local replica will be replaced and rebuilt, then normal authenticated sync will catch up.',
      )
      if (!confirmed) return

      setStatus('Restoring and rebuilding this Workspace replica…')
      const result = await store.restoreWorkspace(access.workspace_id, bundle.events)
      const restored = `Restored ${bundle.events.length} Events and protected ${result.protected_pending} unsynced local Event${result.protected_pending === 1 ? '' : 's'}.`

      if (!sync) {
        setStatus(`${restored} Sync catch-up will begin when collaboration is connected.`)
        return
      }

      const syncStatus = await sync.synchronize()
      setStatus(syncStatus.kind === 'offline'
        ? `${restored} Sync catch-up will retry automatically.`
        : syncStatus.kind === 'attention'
          ? `${restored} Sync catch-up completed with ${syncStatus.rejected} Event${syncStatus.rejected === 1 ? '' : 's'} needing attention.`
        : `${restored} Sync catch-up completed.`)
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : 'Failed to validate the Workspace Event Bundle.')
    }
  }

  return (
    <main style={styles.page}>
      <PageHeader title="Workspace Event Bundle" onHome={onHome} />

      <section style={styles.panel}>
        <p style={styles.description}>
          Export the immutable Workspace Event Log or perform a recovery-only restore. Restore validates the entire Bundle and Workspace before changing this device, protects unsynced Events, rebuilds projections, and catches up through authenticated sync.
        </p>

        <div style={styles.actions}>
          <button type="button" onClick={exportBundle} style={styles.primaryButton}>
            ↓ Export Event Bundle
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} style={styles.secondaryButton}>
            ↑ Restore Event Bundle
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={restoreBundle}
            style={{ display: 'none' }}
          />
        </div>

        <p style={styles.warning}>
          Recovery replaces and rebuilds this Workspace replica. History merge/adoption and photos are not included.
        </p>

        {status && <p role="status" style={styles.status}>{status}</p>}
      </section>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    padding: '1rem 1.5rem',
    background: '#f5f5f5',
    color: '#1b4332',
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    padding: '1rem',
    background: '#fff',
    borderRadius: '8px',
  },
  description: {
    margin: 0,
    fontSize: '0.9rem',
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  primaryButton: {
    padding: '0.7rem',
    background: '#2d6a4f',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  secondaryButton: {
    padding: '0.7rem',
    background: '#fff',
    color: '#2d6a4f',
    border: '2px solid #2d6a4f',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 600,
  },
  warning: {
    margin: 0,
    fontSize: '0.8rem',
    opacity: 0.65,
    fontStyle: 'italic',
  },
  status: {
    margin: 0,
    padding: '0.5rem 0.75rem',
    background: '#d4edda',
    borderRadius: '6px',
    fontSize: '0.85rem',
    color: '#155724',
  },
}
