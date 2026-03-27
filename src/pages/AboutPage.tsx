import PageHeader from '../components/PageHeader'

interface Props {
  onHome: () => void
}

export default function AboutPage({ onHome }: Props) {
  return (
    <div style={{ padding: '1rem' }}>
      <PageHeader title="About" onHome={onHome} />

      <div style={cardStyle}>
        <p style={{ margin: '0 0 1rem', lineHeight: 1.6 }}>
          This app was created for the{' '}
          <strong>Mount Diablo Bird Alliance</strong>{' '}
          MAPS Program Banding Stations.
        </p>

        <a
          href="https://github.com/kenshih/birdnerd"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
        >
          github.com/kenshih/birdnerd
        </a>
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: '#fff',
  borderRadius: 10,
  padding: '1.25rem',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
}

const linkStyle: React.CSSProperties = {
  color: '#2d6a4f',
  fontWeight: 500,
}
