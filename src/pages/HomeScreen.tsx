import { useEffect, useState } from 'react'

type NavMode = 'sessions' | 'banders' | 'band-inventory' | 'locations' | 'export' | 'feedback'

interface Props {
  onNavigate: (mode: NavMode) => void
}

interface NavItem {
  mode: NavMode
  label: string
  description: string
  enabled: boolean
}

const NAV_ITEMS: NavItem[] = [
  { mode: 'sessions', label: 'Session Data', description: 'Create sessions and record bird encounters', enabled: true },
  { mode: 'banders', label: 'People', description: 'Manage team members and roles', enabled: true },
  { mode: 'band-inventory', label: 'Band Inventory', description: 'Coming soon', enabled: false },
  { mode: 'locations', label: 'Project Locations', description: 'Manage banding locations and nets', enabled: true },
  { mode: 'export', label: 'View Data / Export', description: 'Browse records, export CSV', enabled: true },
  { mode: 'feedback', label: 'Report Bugs / Feedback', description: 'Send us an email', enabled: true },
]

function isInstalled(): boolean {
  if ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone) return true
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  return false
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export default function HomeScreen({ onNavigate }: Props) {
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    setInstalled(isInstalled())
  }, [])

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <img src="icons/icon-192.png" alt="BirdNerd" style={styles.icon} />
        <h1 style={styles.title}>BirdNerd</h1>
        <p style={styles.subtitle}>Bird banding data collection</p>
      </div>

      <div style={styles.actions}>
        {NAV_ITEMS.map((item, i) => (
          <button
            key={i}
            style={item.enabled ? styles.navBtn : styles.navBtnDisabled}
            onClick={() => item.enabled && onNavigate(item.mode)}
            disabled={!item.enabled}
          >
            <span style={styles.navLabel}>{item.label}</span>
            <span style={styles.navDesc}>{item.description}</span>
          </button>
        ))}
      </div>

      {!installed && (
        <div style={styles.installBox}>
          <p style={styles.installTitle}>Save to Home Screen</p>
          {isIOS() ? (
            <ol style={styles.installSteps}>
              <li>Tap the <strong>Share</strong> button in Safari <span style={styles.inlineIcon}>&#x2B06;&#xFE0F;</span></li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
              <li>Tap <strong>Add</strong></li>
            </ol>
          ) : (
            <ol style={styles.installSteps}>
              <li>Tap the browser <strong>menu</strong></li>
              <li>Tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong></li>
              <li>Tap <strong>Add</strong></li>
            </ol>
          )}
          <p style={styles.installNote}>Once installed, BirdNerd works offline and opens like a native app.</p>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2rem 1.5rem',
    gap: '1.5rem',
    background: 'linear-gradient(160deg, #1b4332 0%, #2d6a4f 60%, #52b788 100%)',
    color: '#fff',
  },
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  icon: {
    width: '100px',
    height: '100px',
    objectFit: 'contain',
    marginBottom: '0.25rem',
    filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.3))',
  },
  title: {
    margin: 0,
    fontSize: '2.2rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    margin: 0,
    fontSize: '0.85rem',
    opacity: 0.8,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
  },
  actions: {
    width: '100%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  navBtn: {
    width: '100%',
    padding: '0.9rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '0.15rem',
    background: '#fff',
    color: '#1b4332',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  navBtnDisabled: {
    width: '100%',
    padding: '0.9rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '0.15rem',
    background: 'rgba(255,255,255,0.15)',
    color: 'rgba(255,255,255,0.5)',
    border: 'none',
    borderRadius: '10px',
    cursor: 'default',
    textAlign: 'left' as const,
  },
  navLabel: {
    fontSize: '1rem',
    fontWeight: 600,
  },
  navDesc: {
    fontSize: '0.78rem',
    opacity: 0.65,
  },
  installBox: {
    width: '100%',
    maxWidth: '400px',
    background: 'rgba(255,255,255,0.12)',
    borderRadius: '10px',
    padding: '1rem',
    backdropFilter: 'blur(4px)',
  },
  installTitle: {
    margin: '0 0 0.5rem',
    fontWeight: 600,
    fontSize: '0.9rem',
  },
  installSteps: {
    margin: '0 0 0.5rem',
    paddingLeft: '1.25rem',
    lineHeight: 1.7,
    fontSize: '0.85rem',
  },
  inlineIcon: {
    display: 'inline-block',
  },
  installNote: {
    margin: 0,
    fontSize: '0.78rem',
    opacity: 0.7,
  },
}
