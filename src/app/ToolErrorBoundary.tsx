import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
}

export class ToolErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Tool failed to load or render', error, info)
  }

  private reset = (): void => {
    this.setState({ hasError: false })
  }

  private reload = (): void => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="tool-load-error" role="alert">
          <p className="tool-load-error__message">Failed to load tool</p>
          <div className="tool-load-error__actions">
            <button type="button" onClick={this.reset}>
              Try again
            </button>
            <button type="button" onClick={this.reload}>
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
