import type { CSSProperties } from 'react'

export type FieldFeedback = {
  id: string
  message: string
}

/** Inline, non-blocking feedback owned by the Field presentation layer. */
export function ValidationFeedback({ id, message }: FieldFeedback) {
  return <span id={id} role="status" style={styles.message}><span aria-hidden="true">⚠</span> {message}</span>
}

const styles = {
  message: {
    display: 'block',
    margin: 0,
    color: '#c0392b',
    fontSize: '0.8rem',
    fontWeight: 400,
    lineHeight: 1.35,
  },
} satisfies Record<string, CSSProperties>
