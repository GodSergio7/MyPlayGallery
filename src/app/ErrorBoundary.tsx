import { Component, type ReactNode } from 'react'
import { ErrorState } from '@/shared/components/StateViews'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          title="Algo ha fallado"
          description="Recarga la página para volver a intentarlo."
          onRetry={this.handleRetry}
        />
      )
    }

    return this.props.children
  }
}
