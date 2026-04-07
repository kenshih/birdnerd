import { cardStyle, cardElevatedStyle } from '../styles/theme'

interface Props {
  style?: React.CSSProperties
  children: React.ReactNode
}

export function Card({ style, children }: Props) {
  return <div style={{ ...cardStyle, ...style }}>{children}</div>
}

export function CardElevated({ style, children }: Props) {
  return <div style={{ ...cardElevatedStyle, ...style }}>{children}</div>
}
