import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 浏览器扩展注入的脚本异常通常是外部问题，不需要上报
    if (error.message.includes('browser extension')) {
      console.warn('Ignored extension-script error:', error.message);
      return;
    }
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="error-fallback">
            <p>页面遇到了一点小问题。</p>
            <button onClick={() => this.setState({ hasError: false })}>重试</button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
