import { Component, useState } from 'react'
import { useTheme, F } from '../lib/theme'

/* ── Clase base (React requiere class component para error boundaries) ── */
class ErrorBoundaryClass extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Error desconocido' }
  }

  componentDidCatch(error, info) {
    console.error('[PetConnect ErrorBoundary]', error.message, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return typeof this.props.fallback === 'function'
        ? this.props.fallback({ message: this.state.message, onRetry: () => this.setState({ hasError: false }) })
        : (this.props.fallback ?? null)
    }
    return this.props.children
  }
}

/* ── UI de error (componente funcional — puede usar hooks) ── */
function ErrorFallback({ message, onRetry }) {
  const { C } = useTheme()
  return (
    <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 14, textAlign: 'center' }}>
      <div style={{ fontSize: 48 }}>⚠️</div>
      <div style={{ fontFamily: F.display, fontSize: 17, fontWeight: 700, color: C.text }}>
        No pudimos cargar esta sección
      </div>
      <div style={{ fontFamily: F.body, fontSize: 13, color: C.textSub, lineHeight: 1.6,
        maxWidth: 280 }}>
        {message?.includes('Overpass') || message?.includes('fetch') || message?.includes('network')
          ? 'Hubo un problema al consultar OpenStreetMap. Mostrando datos de ejemplo.'
          : 'Ocurrió un error inesperado. Intenta nuevamente.'}
      </div>
      <button onClick={onRetry} style={{ background: C.accent, border: 'none', borderRadius: 12,
        padding: '11px 22px', fontFamily: F.body, fontSize: 13, fontWeight: 600,
        color: C.bg, cursor: 'pointer', transition: 'opacity 0.15s' }}>
        Reintentar
      </button>
      <div style={{ fontFamily: F.body, fontSize: 11, color: C.textMuted }}>
        Los datos de ejemplo siguen disponibles
      </div>
    </div>
  )
}

/* ── TabErrorBoundary — wrapper funcional con clave para retry ── */
export function TabErrorBoundary({ children }) {
  const [key, setKey] = useState(0)
  return (
    <ErrorBoundaryClass
      key={key}
      fallback={({ message, onRetry }) => (
        <ErrorFallback
          message={message}
          onRetry={() => { onRetry(); setKey(k => k + 1) }}
        />
      )}
    >
      {children}
    </ErrorBoundaryClass>
  )
}

export default ErrorBoundaryClass
