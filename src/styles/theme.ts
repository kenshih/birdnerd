// Shared design tokens and common styles
// See tech-specifications.md § 10 for rationale

// ── Colors ────────────────────────────────────────────────────────

export const colors = {
  primary: '#2d6a4f',
  primaryLight: '#d4edda',
  blue: '#1a73e8',
  blueLight: '#cce5ff',
  red: '#c0392b',
  redLight: '#f8d7da',
  yellow: '#fff3cd',

  white: '#fff',
  bgPage: '#f9f9f9',
  bgCard: '#f5f5f5',
  bgGray: '#e9ecef',

  border: '#ccc',
  borderLight: '#ddd',
  borderDark: '#adb5bd',

  text: '#333',
  textMuted: '#888',
  textSecondary: '#666',
  textDark: '#495057',
}

// ── Common Styles ─────────────────────────────────────────────────

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  fontSize: '1rem',
  borderRadius: 6,
  border: `1px solid ${colors.border}`,
  boxSizing: 'border-box',
}

export const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  marginBottom: '0.25rem',
  marginTop: '0.5rem',
}

export const cardStyle: React.CSSProperties = {
  background: colors.bgCard,
  border: `1px solid ${colors.borderLight}`,
  borderRadius: 8,
  padding: '1rem',
}

export const cardElevatedStyle: React.CSSProperties = {
  background: colors.white,
  borderRadius: 10,
  padding: '1rem',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
}

export const rowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.5rem',
}

export const btnStyle = (bg: string): React.CSSProperties => ({
  background: bg,
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '0.6rem 1.2rem',
  fontSize: '1rem',
  cursor: 'pointer',
})

export const nowBtnStyle: React.CSSProperties = {
  background: colors.primary,
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '0.45rem 0.6rem',
  fontSize: '0.8rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

export const dropdownStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  background: colors.white,
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  zIndex: 100,
  marginTop: 2,
}
