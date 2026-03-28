import PageHeader from '../components/PageHeader'
import { cardElevatedStyle, colors } from '../styles/theme'

interface Props {
  onHome: () => void
}

export default function AboutPage({ onHome }: Props) {
  return (
    <div style={{ padding: '1rem' }}>
      <PageHeader title="About" onHome={onHome} />

      <div style={{...cardElevatedStyle, padding: '1.25rem'}}>
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

        <p style={{ margin: '1rem 0 0', fontSize: '0.8rem', color: colors.textMuted }}>
          Version {__APP_VERSION__}
        </p>
      </div>
    </div>
  )
}

const linkStyle: React.CSSProperties = {
  color: colors.primary,
  fontWeight: 500,
}
