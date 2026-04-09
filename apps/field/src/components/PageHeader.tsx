interface Props {
  title: string
  onHome?: () => void
  onBack?: () => void
  backLabel?: string
}

export default function PageHeader({ title, onHome, onBack, backLabel = '← Back' }: Props) {
  return (
    <div style={headerStyle}>
      <div style={leftStyle}>
        {onBack ? (
          <button onClick={onBack} style={backBtnStyle}>{backLabel}</button>
        ) : onHome ? (
          <button onClick={onHome} style={homeBtnStyle} aria-label="Home" title="Home">
            <img src="icons/home-birdhouse.png" alt="Home" style={homeIconStyle} />
          </button>
        ) : null}
        <h1 style={titleStyle}>{title}</h1>
      </div>
      {onBack && onHome && (
        <button onClick={onHome} style={homeBtnStyle} aria-label="Home" title="Home">
          <img src="icons/home-birdhouse.png" alt="Home" style={homeIconSmallStyle} />
        </button>
      )}
    </div>
  )
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '1rem',
}

const leftStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
}

const titleStyle: React.CSSProperties = {
  fontSize: '1.4rem',
  margin: 0,
}

const homeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  lineHeight: 1,
}

const homeIconStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  objectFit: 'contain',
}

const homeIconSmallStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  objectFit: 'contain',
  opacity: 0.7,
}

const backBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#2d6a4f',
  fontSize: '1rem',
  cursor: 'pointer',
  padding: '0.25rem 0',
}
