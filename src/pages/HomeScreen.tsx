import { useEffect, useState } from 'react'

interface Props {
  onStartBanding: () => void
}

function isInstalled(): boolean {
  // iOS Safari standalone mode
  if ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone) return true
  // Android / other browsers
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  return false
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export default function HomeScreen({ onStartBanding }: Props) {
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    setInstalled(isInstalled())
  }, [])

  return (
    <div style={styles.page}>
      <div style={styles.hero}>
        <div style={styles.iconPlaceholder}>🐦</div>
        <h1 style={styles.title}>BirdNerd</h1>
        <p style={styles.subtitle}>Bird banding data collection</p>
      </div>

      <div style={styles.actions}>
        <button style={styles.primaryBtn} onClick={onStartBanding}>
          Start Banding Session
        </button>
      </div>

      {!installed && (
        <div style={styles.installBox}>
          <p style={styles.installTitle}>📲 Save to Home Screen</p>
          {isIOS() ? (
            <ol style={styles.installSteps}>
              <li>Tap the <strong>Share</strong> button in Safari <span style={styles.icon}>⬆️</span></li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
              <li>Tap <strong>Add</strong> — done!</li>
            </ol>
          ) : (
            <ol style={styles.installSteps}>
              <li>Tap the browser <strong>menu</strong> (⋮ or ⋯)</li>
              <li>Tap <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong></li>
              <li>Tap <strong>Add</strong> — done!</li>
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
    justifyContent: 'center',
    padding: '2rem 1.5rem',
    gap: '2rem',
    background: 'linear-gradient(160deg, #1b4332 0%, #2d6a4f 60%, #52b788 100%)',
    color: '#fff',
  },
  hero: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  iconPlaceholder: {
    fontSize: '5rem',
    lineHeight: 1,
    marginBottom: '0.5rem',
  },
  title: {
    margin: 0,
    fontSize: '2.8rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    margin: 0,
    fontSize: '1rem',
    opacity: 0.8,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  actions: {
    width: '100%',
    maxWidth: '360px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  primaryBtn: {
    width: '100%',
    padding: '1rem',
    fontSize: '1.1rem',
    fontWeight: 600,
    background: '#fff',
    color: '#1b4332',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
  },
  installBox: {
    width: '100%',
    maxWidth: '360px',
    background: 'rgba(255,255,255,0.12)',
    borderRadius: '12px',
    padding: '1.25rem',
    backdropFilter: 'blur(4px)',
  },
  installTitle: {
    margin: '0 0 0.75rem',
    fontWeight: 600,
    fontSize: '1rem',
  },
  installSteps: {
    margin: '0 0 0.75rem',
    paddingLeft: '1.25rem',
    lineHeight: 1.8,
    fontSize: '0.95rem',
  },
  icon: {
    display: 'inline-block',
  },
  installNote: {
    margin: 0,
    fontSize: '0.82rem',
    opacity: 0.75,
  },
}
