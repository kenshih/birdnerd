interface Props {
  title: string
  description: string
  onHome: () => void
}

export default function PlaceholderPage({ title, description, onHome }: Props) {
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>{title}</h1>
        <p style={styles.desc}>{description}</p>
        <p style={styles.badge}>Coming Soon</p>
      </div>
      <button onClick={onHome} style={styles.homeBtn} aria-label="Home" title="Home">
        <img src="icons/home-birdhouse.png" alt="Home" style={{ width: 46, height: 46, objectFit: 'contain' }} />
      </button>
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
    gap: '1.5rem',
    background: 'linear-gradient(160deg, #1b4332 0%, #2d6a4f 60%, #52b788 100%)',
    color: '#fff',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: 'rgba(255,255,255,0.12)',
    borderRadius: '12px',
    padding: '2rem 1.5rem',
    textAlign: 'center' as const,
    backdropFilter: 'blur(4px)',
  },
  title: {
    margin: '0 0 0.75rem',
    fontSize: '1.5rem',
    fontWeight: 700,
  },
  desc: {
    margin: '0 0 1rem',
    fontSize: '0.9rem',
    opacity: 0.8,
    lineHeight: 1.5,
  },
  badge: {
    display: 'inline-block',
    margin: 0,
    padding: '0.3rem 0.8rem',
    fontSize: '0.78rem',
    fontWeight: 600,
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '20px',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
  },
  homeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
}
