import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="card text-center max-w-md">
            <h2 className="text-xl font-bold text-red-600 mb-4">
              エラーが発生しました
            </h2>
            <p className="text-gray-600 mb-4">
              申し訳ありません。予期しないエラーが発生しました。
            </p>
            {this.state.error && (
              <p className="text-sm text-gray-500 mb-4 p-2 bg-gray-100 rounded">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="btn-primary"
              >
                再試行
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="btn-secondary"
              >
                ホームへ戻る
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
