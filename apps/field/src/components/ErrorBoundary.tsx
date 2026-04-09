import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { colors, btnStyle } from '../styles/theme'
import { CardElevated } from './Card'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <CardElevated style={{ maxWidth: 400, margin: '2rem auto', padding: '2rem' }}>
          <h2 style={{ margin: '0 0 0.75rem', color: colors.text }}>Something went wrong</h2>
          <p style={{ color: colors.textSecondary, lineHeight: 1.5, margin: '0 0 1.5rem' }}>
            An unexpected error occurred. Your data is safe in local storage.
          </p>
          {this.state.error && (
            <pre style={{
              background: colors.bgCard,
              padding: '0.75rem',
              borderRadius: 6,
              fontSize: '0.75rem',
              color: colors.red,
              textAlign: 'left',
              overflow: 'auto',
              maxHeight: 120,
              margin: '0 0 1.5rem',
            }}>
              {this.state.error.message}
            </pre>
          )}
          <button onClick={this.handleReset} style={btnStyle(colors.primary)}>
            Return to Home
          </button>
        </CardElevated>
      </div>
    )
  }
}
