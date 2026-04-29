import { Component } from 'react'

// Catches any React render crash and shows a readable error instead of blank screen
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('HR Intel crashed:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: '100vh',
        background: '#F7F0E6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'DM Sans, system-ui, sans-serif',
      }}>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid #DDD0BC',
          borderTop: '4px solid #C05A1A',
          borderRadius: 12,
          padding: 40,
          maxWidth: 520,
          width: '100%',
        }}>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Playfair Display, Georgia, serif', color: '#1A1208', marginBottom: 8 }}>
            HR Intel
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#C05A1A', marginBottom: 12 }}>
            Something went wrong
          </div>
          <div style={{
            background: '#F7F0E6',
            border: '1px solid #DDD0BC',
            borderRadius: 6,
            padding: '10px 14px',
            fontFamily: 'DM Mono, monospace',
            fontSize: 12,
            color: '#5C4A30',
            marginBottom: 20,
            wordBreak: 'break-word',
            lineHeight: 1.6,
          }}>
            {this.state.error?.message || 'Unknown error'}
          </div>
          <p style={{ fontSize: 13, color: '#5C4A30', lineHeight: 1.6, marginBottom: 20 }}>
            This is usually caused by a temporary Gemini API response issue.
            Your saved articles and notes are safe — they are stored in your browser.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                flex: 1, padding: '10px 0', background: '#C05A1A', color: '#fff',
                border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Reload & Retry
            </button>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                flex: 1, padding: '10px 0', background: '#F7F0E6', color: '#5C4A30',
                border: '1px solid #DDD0BC', borderRadius: 6, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              }}
            >
              Try Without Reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}
