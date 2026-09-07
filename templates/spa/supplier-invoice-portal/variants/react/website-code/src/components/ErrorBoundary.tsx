import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: 40,
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.5rem',
              marginBottom: 12,
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '0.95rem',
              marginBottom: 24,
              maxWidth: 400,
            }}
          >
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false })
              window.location.href = '/'
            }}
            style={{
              padding: '11px 24px',
              borderRadius: 'var(--radius)',
              background: 'var(--color-primary)',
              color: '#fff',
              fontWeight: 600,
              fontFamily: 'var(--font-heading)',
              fontSize: '0.938rem',
            }}
          >
            Go to Home
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
