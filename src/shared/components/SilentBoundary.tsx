import { Component, type ReactNode } from 'react'

/** Para piezas decorativas (el fondo animado): si fallan, no se muestran y la app sigue funcionando. */
export class SilentBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
