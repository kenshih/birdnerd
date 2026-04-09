import { cardStyle, cardElevatedStyle } from '../styles/theme'

interface Props {
  style?: React.CSSProperties
  children: React.ReactNode
}

const defaultMargin: React.CSSProperties = { marginTop: '0.75rem' }

export function Card({ style, children }: Props) {
  return <div style={{ ...defaultMargin, ...cardStyle, ...style }}>{children}</div>
}

export function CardElevated({ style, children }: Props) {
  return <div style={{ ...defaultMargin, ...cardElevatedStyle, ...style }}>{children}</div>
}
